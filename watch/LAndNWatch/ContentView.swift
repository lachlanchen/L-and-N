import SwiftUI

struct ContentView: View {
    @StateObject private var model = DrillModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                HStack {
                    Label("L–and–N", systemImage: "waveform")
                        .font(.headline)
                    Spacer()
                    Text("\(model.accuracy)%")
                        .font(.caption.bold())
                        .foregroundStyle(.mint)
                }

                Text(model.current.word)
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.7)

                Button(action: model.listen) {
                    Label("Listen", systemImage: "speaker.wave.2.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.indigo)

                HStack(spacing: 8) {
                    soundButton("L", color: .orange)
                    soundButton("N", color: .mint)
                }

                Text(model.feedback)
                    .font(.caption2)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)

                if model.answered {
                    Button("Next word", action: model.next)
                        .buttonStyle(.bordered)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private func soundButton(_ sound: String, color: Color) -> some View {
        Button(sound) { model.choose(sound) }
            .font(.title3.bold())
            .frame(maxWidth: .infinity)
            .tint(color)
            .disabled(model.answered)
            .accessibilityLabel("Choose sound \(sound)")
    }
}

#Preview {
    ContentView()
}
