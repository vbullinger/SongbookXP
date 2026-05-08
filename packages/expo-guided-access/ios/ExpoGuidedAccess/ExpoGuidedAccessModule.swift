// Exposes UIAccessibility.isGuidedAccessEnabled to JS plus an event when
// the OS toggles it. Mirrors the behavior the upstream iOS Swift app
// relies on (master commit 1d2c58e): enabling Guided Access can send a
// phantom Play command to MPRemoteCommandCenter, and the audio layer
// needs to suppress lock-screen registration while it's active so the
// player doesn't auto-start.

import ExpoModulesCore
import UIKit

public class ExpoGuidedAccessModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ExpoGuidedAccess")

    Events("change")

    Function("isEnabled") { () -> Bool in
      return UIAccessibility.isGuidedAccessEnabled
    }

    OnCreate {
      self.observer = NotificationCenter.default.addObserver(
        forName: UIAccessibility.guidedAccessStatusDidChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("change", [
          "enabled": UIAccessibility.isGuidedAccessEnabled
        ])
      }
    }

    OnDestroy {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }
  }
}
