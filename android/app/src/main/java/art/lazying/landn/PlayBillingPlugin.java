package art.lazying.landn;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;
import java.util.List;

/**
 * One non-consumable Google Play product, "full_access", that unlocks the whole
 * curriculum on Android. The web app is free and the iOS app is paid up front,
 * so this plugin only exists on Android.
 *
 * Methods:
 *  - getStatus(): { available, owned, price, productId } — connects, reads the
 *    product's localized price and whether this Google account already owns it.
 *  - purchase(): launches the Play purchase sheet; resolves { owned } once the
 *    purchase is acknowledged, or { owned: false, cancelled: true }.
 *  - restore(): re-queries owned purchases (the same query getStatus runs).
 */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    static final String PRODUCT_ID = "full_access";

    /** The paid Pro listing (package suffix .pro) ships everything unlocked and never talks to Play Billing. */
    private boolean isProEdition() {
        return getContext().getPackageName().endsWith(".pro");
    }

    private JSObject proStatus() {
        JSObject out = new JSObject();
        out.put("available", false);
        out.put("owned", true);
        out.put("productId", PRODUCT_ID);
        return out;
    }

    private BillingClient client;
    private ProductDetails product;
    private PluginCall purchaseCall;

    private interface Ready {
        void run(boolean connected, String message);
    }

    private synchronized void connect(Ready ready) {
        if (client != null && client.isReady()) {
            ready.run(true, null);
            return;
        }
        if (client == null) {
            client = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
        }
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                boolean ok = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
                ready.run(ok, ok ? null : result.getDebugMessage());
            }

            @Override
            public void onBillingServiceDisconnected() {
                // The next call reconnects.
            }
        });
    }

    private void loadProduct(Ready ready) {
        if (product != null) {
            ready.run(true, null);
            return;
        }
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(PRODUCT_ID)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()))
            .build();
        client.queryProductDetailsAsync(params, (result, queryResult) -> {
            List<ProductDetails> list = queryResult.getProductDetailsList();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && !list.isEmpty()) {
                product = list.get(0);
                ready.run(true, null);
            } else {
                ready.run(false, "product unavailable: " + result.getDebugMessage());
            }
        });
    }

    private void queryOwned(Ready ready) {
        client.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                boolean owned = false;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    for (Purchase purchase : purchases) {
                        if (isFullAccess(purchase)) {
                            owned = true;
                            acknowledgeIfNeeded(purchase);
                        }
                    }
                }
                ready.run(owned, null);
            });
    }

    private static boolean isFullAccess(Purchase purchase) {
        return purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED
            && purchase.getProducts().contains(PRODUCT_ID);
    }

    private void acknowledgeIfNeeded(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        client.acknowledgePurchase(
            AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),
            result -> { /* Play retries unacknowledged purchases; nothing else to do. */ });
    }

    private JSObject status(boolean available, boolean owned) {
        JSObject out = new JSObject();
        out.put("available", available);
        out.put("owned", owned);
        out.put("productId", PRODUCT_ID);
        if (product != null && product.getOneTimePurchaseOfferDetails() != null) {
            out.put("price", product.getOneTimePurchaseOfferDetails().getFormattedPrice());
        }
        return out;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        if (isProEdition()) {
            call.resolve(proStatus());
            return;
        }
        connect((connected, message) -> {
            if (!connected) {
                call.resolve(status(false, false));
                return;
            }
            loadProduct((haveProduct, productMessage) ->
                queryOwned((owned, ignored) -> call.resolve(status(haveProduct, owned))));
        });
    }

    @PluginMethod
    public void restore(PluginCall call) {
        if (isProEdition()) {
            call.resolve(proStatus());
            return;
        }
        connect((connected, message) -> {
            if (!connected) {
                call.resolve(status(false, false));
                return;
            }
            queryOwned((owned, ignored) -> call.resolve(status(product != null, owned)));
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        if (isProEdition()) {
            call.resolve(proStatus());
            return;
        }
        connect((connected, message) -> {
            if (!connected) {
                call.reject("billing unavailable: " + message);
                return;
            }
            loadProduct((haveProduct, productMessage) -> {
                if (!haveProduct) {
                    call.reject(productMessage);
                    return;
                }
                Activity activity = getActivity();
                if (activity == null) {
                    call.reject("no activity");
                    return;
                }
                BillingFlowParams flow = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(
                        BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build()))
                    .build();
                synchronized (this) {
                    purchaseCall = call;
                }
                activity.runOnUiThread(() -> {
                    BillingResult launched = client.launchBillingFlow(activity, flow);
                    if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        finishPurchase(false, false, "launch failed: " + launched.getDebugMessage());
                    }
                });
            });
        });
    }

    private void finishPurchase(boolean owned, boolean cancelled, String error) {
        PluginCall call;
        synchronized (this) {
            call = purchaseCall;
            purchaseCall = null;
        }
        if (call == null) return;
        if (error != null) {
            call.reject(error);
            return;
        }
        JSObject out = status(product != null, owned);
        out.put("cancelled", cancelled);
        call.resolve(out);
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            finishPurchase(false, true, null);
            return;
        }
        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            finishPurchase(true, false, null);
            return;
        }
        if (code != BillingClient.BillingResponseCode.OK || purchases == null) {
            finishPurchase(false, false, "purchase failed: " + result.getDebugMessage());
            return;
        }
        boolean owned = false;
        for (Purchase purchase : purchases) {
            if (isFullAccess(purchase)) {
                owned = true;
                acknowledgeIfNeeded(purchase);
            }
        }
        // A PENDING purchase (e.g. cash payment) resolves as not owned yet; the
        // next getStatus() on launch picks it up once Play completes it.
        finishPurchase(owned, false, null);
    }
}
