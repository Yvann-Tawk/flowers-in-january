// ═══════════════════════════════════════════════════════════════
//  Flowers in January — macOS app shell
//  A window with a WKWebView that plays the game from the files inside the
//  app bundle (Contents/Resources/game), served on the app:// scheme so the
//  game loads exactly as it does from a web server. Works offline.
//  Built by mac/build.sh (swiftc, no Xcode project needed).
// ═══════════════════════════════════════════════════════════════
import AppKit
import WebKit
import UniformTypeIdentifiers

// Serves app://game/<path> from Contents/Resources/game/<path>
final class GameFiles: NSObject, WKURLSchemeHandler {
    let root: URL
    init(root: URL) { self.root = root }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path.removingPercentEncoding ?? url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path),
              let data = try? Data(contentsOf: file) else {
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didFinish()
            return
        }
        let mime = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let headers = ["Content-Type": mime, "Content-Length": String(data.count), "Access-Control-Allow-Origin": "*"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate {
    var window: NSWindow!
    var web: WKWebView!

    func applicationDidFinishLaunching(_ note: Notification) {
        let root = Bundle.main.resourceURL!.appendingPathComponent("game")
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(GameFiles(root: root), forURLScheme: "app")
        config.mediaTypesRequiringUserActionForPlayback = []          // music can start right away
        config.websiteDataStore = .default()                          // the save (localStorage) persists
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self
        web.setValue(false, forKey: "drawsBackground")

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 760),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                          backing: .buffered, defer: false)
        window.title = "Flowers in January"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = .black
        window.minSize = NSSize(width: 800, height: 450)
        window.collectionBehavior = [.fullScreenPrimary]
        window.contentView = web
        window.center()
        window.setFrameAutosaveName("FlowersInJanuaryWindow")
        window.makeKeyAndOrderFront(nil)

        web.load(URLRequest(url: URL(string: "app://game/index.html")!))
        buildMenu()
        NSApp.activate(ignoringOtherApps: true)
        if let out = ProcessInfo.processInfo.environment["FIJ_SELFTEST"] { selfTest(to: out) }
    }

    // FIJ_SELFTEST=/some/dir: after loading, write the game's state + a window snapshot there, then quit
    func selfTest(to dir: String) {
        let js = """
        (async () => {
          const t0 = Date.now();
          while (!window.bootDone && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 200));
          let ls = 'no'; try { localStorage.setItem('fij-test', '1'); ls = localStorage.getItem('fij-test'); } catch (e) { ls = 'error ' + e; }
          return JSON.stringify({ title: document.title, boot: !!window.bootDone, font: document.fonts.check('20px PixelAE'),
            phaser: window.Phaser && Phaser.VERSION, audio: game.sound.context && game.sound.context.state,
            localStorage: ls, gamepadApi: !!navigator.getGamepads, size: [innerWidth, innerHeight] });
        })()
        """
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.web.callAsyncJavaScript("return await " + js, arguments: [:], in: nil, in: .page) { result in
                var text = ""
                switch result { case .success(let v): text = "\(v)"; case .failure(let e): text = "ERROR \(e)" }
                try? text.write(toFile: dir + "/selftest.json", atomically: true, encoding: .utf8)
                self.web.takeSnapshot(with: nil) { image, _ in
                    if let img = image, let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
                       let png = rep.representation(using: .png, properties: [:]) {
                        try? png.write(to: URL(fileURLWithPath: dir + "/selftest.png"))
                    }
                    NSApp.terminate(nil)
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem(); main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Flowers in January", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Flowers in January", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Flowers in January", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let viewMenu = NSMenu(title: "View")
        let fs = NSMenuItem(title: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fs.keyEquivalentModifierMask = [.command, .control]
        viewMenu.addItem(fs)
        viewItem.submenu = viewMenu
        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
