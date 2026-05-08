// Copies a file from a possibly security-scoped or iCloud-placeholder URL
// into our app sandbox. expo-file-system's `copyAsync` does not claim
// security-scoped access on file:// URLs that originate outside the app
// container (Files.app → iCloud Drive, third-party DocumentProviders,
// etc.), so reads fail with "not readable." NSFileCoordinator additionally
// materializes iCloud placeholders before handing back a coordinated URL.

import ExpoModulesCore
import Foundation

public class ExpoIosSecureCopyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoIosSecureCopy")

    AsyncFunction("copyFile") { (fromUri: String, toUri: String) -> Void in
      let sourceUrl = ExpoIosSecureCopyModule.url(from: fromUri)
      let destinationUrl = ExpoIosSecureCopyModule.url(from: toUri)

      // Claim security-scoped access. Returns false if the URL doesn't need
      // it (e.g. URL already inside our container), which is harmless — we
      // only release if we claimed.
      let claimed = sourceUrl.startAccessingSecurityScopedResource()
      defer {
        if claimed {
          sourceUrl.stopAccessingSecurityScopedResource()
        }
      }

      let coordinator = NSFileCoordinator()
      var coordinatorError: NSError?
      var copyError: Error?

      coordinator.coordinate(
        readingItemAt: sourceUrl,
        options: [],
        error: &coordinatorError
      ) { coordinatedUrl in
        do {
          if FileManager.default.fileExists(atPath: destinationUrl.path) {
            try FileManager.default.removeItem(at: destinationUrl)
          }
          try FileManager.default.copyItem(at: coordinatedUrl, to: destinationUrl)
        } catch {
          copyError = error
        }
      }

      if let error = coordinatorError {
        throw Exception(
          name: "CoordinatorError",
          description: "NSFileCoordinator failed: \(error.localizedDescription)"
        )
      }
      if let error = copyError {
        throw Exception(
          name: "CopyError",
          description: "FileManager.copyItem failed: \(error.localizedDescription)"
        )
      }
    }
  }

  private static func url(from uri: String) -> URL {
    // `file://` URIs round-trip through URL(string:), but a plain filesystem
    // path needs URL(fileURLWithPath:). Try the URL parser first; fall back
    // to the path constructor if the result has no scheme.
    if let parsed = URL(string: uri), parsed.scheme != nil {
      return parsed
    }
    return URL(fileURLWithPath: uri)
  }
}

// Local Exception type that bridges to ExpoModulesCore's expected error
// surface. ExpoModulesCore picks up any `Error` thrown from inside an
// AsyncFunction and forwards it to JS as a Promise rejection.
private struct Exception: Error, LocalizedError {
  let name: String
  let description: String
  var errorDescription: String? { description }
}
