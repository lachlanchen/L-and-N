import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        #if targetEnvironment(macCatalyst)
        windowScene.sizeRestrictions?.minimumSize = CGSize(width: 640, height: 700)
        windowScene.title = "L & N"
        #if DEBUG
        if CommandLine.arguments.contains("--landn-smoke-test") {
            // Real UI at a repeatable 16:10 viewport; never enabled in Release.
            windowScene.sizeRestrictions?.minimumSize = CGSize(width: 1280, height: 800)
            windowScene.sizeRestrictions?.maximumSize = CGSize(width: 1280, height: 800)
        }
        #endif
        #endif

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = LAndNBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
