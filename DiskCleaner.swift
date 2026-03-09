import Cocoa
import WebKit

// ── Find node ────────────────────────────────────────────────────────────────
func findNode(appDir: String) -> String {
    // Bundled node inside the app takes priority — works with no prerequisites
    let bundled = appDir + "/node"
    if FileManager.default.fileExists(atPath: bundled) { return bundled }

    // Fall back to system node if bundled binary is missing
    let candidates = [
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        "/usr/bin/node",
        (ProcessInfo.processInfo.environment["HOME"] ?? "") + "/.nvm/versions/node/\(nmvCurrent())/bin/node",
    ]
    for p in candidates { if FileManager.default.fileExists(atPath: p) { return p } }
    let t = Process(); let pipe = Pipe()
    t.executableURL = URL(fileURLWithPath: "/usr/bin/which")
    t.arguments = ["node"]; t.standardOutput = pipe
    try? t.run(); t.waitUntilExit()
    let out = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
        .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    return out.isEmpty ? "node" : out
}

func nmvCurrent() -> String {
    let alias = (ProcessInfo.processInfo.environment["HOME"] ?? "") + "/.nvm/alias/default"
    return (try? String(contentsOfFile: alias, encoding: .utf8))?
        .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
}

// ── Server process ────────────────────────────────────────────────────────────
var serverProcess: Process?
var serverPort: Int = 3501

func startServer(appDir: String, completion: @escaping (Int) -> Void) {
    let node = findNode(appDir: appDir)
    let serverScript = appDir + "/server.js"
    let port = 3501

    let p = Process()
    p.executableURL = URL(fileURLWithPath: node)
    p.arguments = [serverScript, "\(port)"]

    // Inherit PATH so node can find system tools
    var env = ProcessInfo.processInfo.environment
    env["PATH"] = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:" + (env["PATH"] ?? "")
    p.environment = env

    let outPipe = Pipe()
    p.standardOutput = outPipe
    p.standardError = FileHandle.nullDevice

    outPipe.fileHandleForReading.readabilityHandler = { handle in
        let data = handle.availableData
        if let line = String(data: data, encoding: .utf8), line.hasPrefix("ready:") {
            outPipe.fileHandleForReading.readabilityHandler = nil
            serverPort = port
            DispatchQueue.main.async { completion(port) }
        }
    }

    try? p.run()
    serverProcess = p
}

// ── App Delegate ──────────────────────────────────────────────────────────────
class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var appDir: String = ""

    func applicationDidFinishLaunching(_ notification: Notification) {
        appDir = Bundle.main.resourcePath ?? FileManager.default.currentDirectoryPath

        // Window
        let rect = NSRect(x: 0, y: 0, width: 880, height: 700)
        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Disk Cleaner"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(red: 0.059, green: 0.059, blue: 0.071, alpha: 1)
        window.minSize = NSSize(width: 680, height: 500)
        window.center()

        // Loading placeholder
        let loading = NSTextField(labelWithString: "Starting…")
        loading.textColor = .secondaryLabelColor
        loading.font = .systemFont(ofSize: 14)
        loading.frame = rect
        loading.alignment = .center
        window.contentView = loading

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        startServer(appDir: appDir) { port in
            self.loadWebView(port: port)
        }
    }

    func loadWebView(port: Int) {
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        window.contentView = webView

        let url = URL(string: "http://127.0.0.1:\(port)/")!
        webView.load(URLRequest(url: url))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ notification: Notification) {
        serverProcess?.terminate()
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)

// Minimal menu bar
let menu = NSMenu()
let appMenuItem = NSMenuItem()
menu.addItem(appMenuItem)
let appMenu = NSMenu()
appMenuItem.submenu = appMenu
appMenu.addItem(NSMenuItem(title: "Quit Disk Cleaner", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
app.mainMenu = menu

app.run()
