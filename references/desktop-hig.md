# Desktop HIG Reference Library

> Curated Apple Human Interface Guidelines patterns for macOS desktop platform.
> Loaded via `@` reference from skills using tiered depth selection.
>
> **Version:** 1.0
> **Scope:** macOS navigation, components, typography, platform behaviors
> **Ownership:** Shared (HIG, SYS, WFR, MCK)

---

<!-- TIER: essentials -->

## Navigation Patterns

### Menu Bar

The menu bar is the primary navigation and command interface on macOS.

**Standard Menu Structure:**
| Menu | Required Items | Notes |
|------|---------------|-------|
| App Menu | About, Preferences/Settings (Cmd+,), Hide (Cmd+H), Quit (Cmd+Q) | Named after the app |
| File | New (Cmd+N), Open (Cmd+O), Save (Cmd+S), Close (Cmd+W) | Document-based apps |
| Edit | Undo (Cmd+Z), Redo (Cmd+Shift+Z), Cut/Copy/Paste, Select All (Cmd+A) | Universal |
| View | Show/Hide Sidebar, Enter Full Screen (Ctrl+Cmd+F), Zoom In/Out | Layout controls |
| Window | Minimize (Cmd+M), Zoom, Bring All to Front | Window management |
| Help | Search field (auto-provided), app-specific help | System-provided search |

**SwiftUI:**
```swift
WindowGroup { ContentView() }
    .commands {
        CommandGroup(replacing: .newItem) {
            Button("New Document") { createDocument() }
                .keyboardShortcut("n", modifiers: .command)
        }
        CommandMenu("Export") {
            Button("Export as PDF...") { exportPDF() }
                .keyboardShortcut("e", modifiers: [.command, .shift])
        }
    }
```

**Anti-patterns:**
- Hiding essential commands behind right-click only (no menu bar equivalent)
- Using non-standard keyboard shortcuts for standard actions
- Omitting the Help menu (system provides search integration)
- Not providing Cmd+, for Preferences/Settings

---

### Sidebar Navigation

macOS apps use sidebars as the primary navigation structure (replacing iOS tab bars).

**Source List Style:**
- Translucent sidebar background (`.ultraThinMaterial`)
- Section headers in small caps, non-interactive
- Disclosure triangles for collapsible groups
- Selection indicator: rounded highlight rectangle
- Minimum width: 200pt, user-resizable

**SwiftUI:**
```swift
NavigationSplitView {
    List(selection: $selectedItem) {
        Section("Library") {
            Label("All Items", systemImage: "folder")
            Label("Favorites", systemImage: "star")
        }
    }
    .listStyle(.sidebar)
    .navigationSplitViewColumnWidth(min: 200, ideal: 250)
} detail: {
    DetailView(item: selectedItem)
}
```

**Patterns:**
- Two-column: sidebar + detail (most common)
- Three-column: sidebar + content list + detail (Mail, Notes)
- Collapsible sidebar via toolbar button or Cmd+Ctrl+S
- Source list vs inset grouped list styling options

---

### Toolbar

Toolbars sit in the title bar region for quick access to frequent actions.

- Customizable by user (right-click toolbar to customize)
- Overflow menu for narrow windows (chevron at trailing edge)
- Title bar integration: unified title/toolbar appearance (default)
- Styles: `.automatic`, `.expanded`, `.unified`, `.unifiedCompact`

```swift
ContentView()
    .toolbar {
        ToolbarItem(placement: .primaryAction) {
            Button(action: addItem) { Label("Add", systemImage: "plus") }
        }
    }
    .toolbarStyle(.unified)
```

---

### Tab Views

**Document Tabs:** System-managed (Window > Merge All Windows), draggable between windows, close button on hover.

**Preferences Tabs:** Top-aligned icon+label tabs (System Preferences style). Use `Settings` scene with `TabView`:
```swift
Settings {
    TabView {
        GeneralSettings().tabItem { Label("General", systemImage: "gear") }
        AppearanceSettings().tabItem { Label("Appearance", systemImage: "paintbrush") }
    }
    .frame(width: 450, height: 300)
}
```

---

### Window Management

**Window Types:**
| Type | Use Case | Behavior |
|------|----------|----------|
| Standard | Main app content | Resizable, movable, title bar with traffic lights |
| Utility | Inspectors, palettes | Floats above standard windows, smaller title bar |
| Panel | Tool palettes | Can be key without being main |
| Full Screen | Immersive content | Hides menu bar and Dock, own Space |
| Split View | Side-by-side apps | Two apps share full screen, system-managed |

**Traffic Light Buttons (Window Controls):**
- Red (close): Closes window, may not quit app
- Yellow (minimize): Sends to Dock
- Green (zoom): Full screen or maximize (Option+click for old-style zoom)
- Hover reveals button icons; hidden when window is inactive

```swift
WindowGroup { ContentView() }
    .defaultSize(width: 800, height: 600)
    .windowResizability(.contentMinSize)
```

---

## Components and Controls

### Buttons

| Style | Use Case | Appearance |
|-------|----------|------------|
| `.borderedProminent` | Primary action | Filled, accent color |
| `.bordered` | Secondary action | Bordered, translucent fill |
| `.borderless` | Inline action | Text only |
| `.plain` | Custom appearance | No system styling |
| `.link` | Navigation action | Blue underlined text |

```swift
HStack {
    Button("Cancel", role: .cancel) { dismiss() }.keyboardShortcut(.escape)
    Button("Save") { save() }.keyboardShortcut(.return).buttonStyle(.borderedProminent)
}
```

**Pop-up/Pull-down:**
```swift
Picker("Format", selection: $format) {
    Text("PDF").tag(Format.pdf)
    Text("PNG").tag(Format.png)
}.pickerStyle(.menu)

Menu("Actions") {
    Button("Duplicate") { duplicate() }
    Divider()
    Button("Delete", role: .destructive) { delete() }
}
```

---

### Text Fields

| Type | Use Case | Appearance |
|------|----------|------------|
| Standard | Data entry | Bordered rectangle, white fill |
| Search | Filtering | Rounded, magnifying glass icon, cancel button |
| Secure | Passwords | Bullets, show/hide toggle |
| Token | Tags, recipients | Rounded pills for each entry |

```swift
TextField("Name", text: $name)
TextField("Search", text: $searchText).textFieldStyle(.roundedBorder)
SecureField("Password", text: $password)
```

---

### Table Views

Sortable column-based data display.

```swift
Table(items, selection: $selectedItems, sortOrder: $sortOrder) {
    TableColumn("Name", value: \.name)
    TableColumn("Size", value: \.size) { Text($0.size, format: .byteCount(style: .file)) }
}
```

**Table Behaviors:**
- Click column header to sort (ascending/descending toggle)
- Sort indicator arrow in active column header
- Column reordering by dragging headers
- Column resizing by dragging header borders
- Right-click header to show/hide columns
- Multi-selection with Cmd+click and Shift+click
- Alternating row colors for readability (automatic in SwiftUI)

---

### Outline Views

Hierarchical data with disclosure triangles.

```swift
List(items, children: \.children) { item in
    Label(item.name, systemImage: item.icon)
}
```

**Behaviors:**
- Disclosure triangle at leading edge (click to expand/collapse)
- Option+click disclosure triangle expands all children recursively
- Arrow keys navigate; Right arrow expands, Left arrow collapses
- Source list style for sidebar navigation
- Standard style for content lists

---

### Popovers and Sheets

**Popovers** appear anchored to a control with a directional arrow. **Sheets** slide down from the title bar as window-attached modal dialogs.

```swift
Button("Info") { showPopover = true }
    .popover(isPresented: $showPopover, arrowEdge: .bottom) {
        Text("Details").padding().frame(width: 300)
    }

.sheet(isPresented: $showSheet) {
    VStack {
        Text("Save Changes?")
        HStack {
            Button("Don't Save", role: .destructive) { discardAndClose() }
            Spacer()
            Button("Cancel", role: .cancel) { showSheet = false }
            Button("Save") { saveAndClose() }.buttonStyle(.borderedProminent).keyboardShortcut(.return)
        }
    }.padding().frame(width: 400)
}
```

---

## Typography and Spacing

### System Font -- SF Pro

macOS and iOS share SF Pro but use different default sizes (closer viewing distance, pointer precision).

| Style | Size | Weight | Use Case |
|-------|------|--------|----------|
| `.largeTitle` | 26pt | Regular | Window titles, hero text |
| `.title` | 22pt | Regular | Section headers |
| `.title2` | 17pt | Regular | Subsection headers |
| `.title3` | 15pt | Regular | Tertiary headers |
| `.headline` | 13pt | Bold | Emphasized body text |
| `.body` | 13pt | Regular | Primary content (default) |
| `.callout` | 12pt | Regular | Secondary content |
| `.subheadline` | 11pt | Regular | Captions, metadata |
| `.footnote` | 10pt | Regular | Fine print |
| `.caption` | 10pt | Regular | Supplementary labels |

**Key differences from iOS:**
- macOS `.body` is 13pt (iOS is 17pt)
- macOS `.largeTitle` is 26pt (iOS is 34pt)
- macOS uses smaller sizes throughout due to closer viewing distance and pointer precision
- macOS does NOT support Dynamic Type by default (no accessibility size slider like iOS)
- Monospaced: `.system(.body, design: .monospaced)` for code displays

### Spacing and Layout

| Context | Value | Notes |
|---------|-------|-------|
| Window margin | 20pt | All edges |
| Control spacing | 8pt | Horizontal and vertical |
| Section spacing | 16pt | Between logical groups |
| Label-to-control | 8pt | Label above or beside |
| Button spacing | 12pt | Between Cancel/OK |
| Sidebar width | 200-250pt | Minimum 200pt |
| Toolbar height | 38pt / 52pt | Compact / expanded |

```swift
VStack(alignment: .leading, spacing: 16) {
    GroupBox("General") {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Name", text: $name)
            TextField("Description", text: $description)
        }.padding(8)
    }
}.padding(20)
```

<!-- TIER: standard -->

## Navigation Patterns (Extended)

### NavigationSplitView Layouts

**Three-Column:**
```swift
NavigationSplitView {
    List(categories, selection: $selectedCategory) { cat in
        Label(cat.name, systemImage: cat.icon)
    }.listStyle(.sidebar)
} content: {
    if let category = selectedCategory {
        List(category.items, selection: $selectedItem) { Text($0.name) }
    }
} detail: {
    if let item = selectedItem { ItemDetailView(item: item) }
}
```

### Settings Window

```swift
Settings {
    TabView {
        Form {
            TextField("Username", text: $username)
            Toggle("Beta features", isOn: $betaFeatures)
            Picker("Theme", selection: $theme) {
                Text("System").tag(Theme.system)
                Text("Light").tag(Theme.light)
                Text("Dark").tag(Theme.dark)
            }
        }.formStyle(.grouped).tabItem { Label("General", systemImage: "gear") }
    }.frame(width: 450, height: 300)
}
```

---

## Components and Controls (Extended)

### Alerts

macOS alerts follow a specific layout: icon + title + message + buttons.

**Alert Styles:**
| Style | Icon | Use Case |
|-------|------|----------|
| Informational | App icon | General information |
| Warning | Yellow triangle | Potential data loss |
| Critical | Red stop sign | Destructive action confirmation |

```swift
.alert("Delete Project?", isPresented: $showDeleteAlert) {
    Button("Delete", role: .destructive) { deleteProject() }
    Button("Cancel", role: .cancel) { }
} message: {
    Text("This action cannot be undone.")
}
```

### Open/Save Panels

```swift
// SwiftUI file exporter
.fileExporter(isPresented: $showExport, document: myDocument, contentType: .pdf) { result in }

// AppKit open panel
let panel = NSOpenPanel()
panel.allowsMultipleSelection = true
panel.allowedContentTypes = [.pdf, .png, .jpeg]
panel.beginSheetModal(for: window) { response in
    if response == .OK { let urls = panel.urls }
}
```

### Inspector Panel

```swift
ContentView()
    .inspector(isPresented: $showInspector) {
        InspectorContent().inspectorColumnWidth(min: 250, ideal: 300, max: 400)
    }
```

### Additional Controls

**Stepper:** `Stepper("Qty: \(qty)", value: $qty, in: 1...100)`

**Date Picker:** `DatePicker("Due", selection: $date).datePickerStyle(.field)` -- styles: `.field`, `.graphical`, `.stepperField`

**Split Views:**
```swift
HSplitView { EditorView().frame(minWidth: 300); PreviewView().frame(minWidth: 200) }
```

---

## Typography and Spacing (Extended)

### Accessibility

**VoiceOver on macOS:** Keyboard-driven (Ctrl+Option modifier). Rotor: VO+U. Navigation: VO+Right/Left. Activation: VO+Space.

**Keyboard Navigation:** Full Keyboard Access enables Tab through all controls. Space activates buttons/checkboxes. Arrow keys navigate within controls. Return triggers default button (pulsing blue). Escape cancels/closes.

**Focus Rings:**
```swift
.focusable()
.focused($isFocused)
.overlay {
    if isFocused { RoundedRectangle(cornerRadius: 4).stroke(Color.accentColor, lineWidth: 2) }
}
```

**Accessibility Labels:**
```swift
Button(action: addItem) { Image(systemName: "plus") }
    .accessibilityLabel("Add new item")
    .accessibilityHint("Creates a new item in the current list")
```

### Grid Alignment

```swift
Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 8) {
    GridRow {
        Text("Name:").gridColumnAlignment(.trailing)
        TextField("", text: $name)
    }
    GridRow {
        Text("Email:")
        TextField("", text: $email)
    }
}.padding(20)
```

<!-- TIER: comprehensive -->

## Platform Behaviors

### Mouse and Trackpad

**Cursor States:** Arrow (default), I-beam (text), Pointing hand (links), Crosshair (selection), Open/Closed hand (drag), Resize (borders). All system-provided.

**Hover States:**
```swift
Text("Item")
    .background(isHovered ? Color.accentColor.opacity(0.1) : Color.clear)
    .onHover { isHovered = $0 }
```

**Right-Click Context Menus:**
```swift
Text(item.name).contextMenu {
    Button("Open") { open(item) }
    Button("Duplicate") { duplicate(item) }
    Divider()
    Button("Move to Trash", role: .destructive) { trash(item) }
}
```

**Scroll Behaviors:**
- Momentum scrolling (trackpad inertia)
- Scroll bars: overlay style (appear on scroll, fade out) or always visible (System Settings)
- Horizontal scroll with Shift+scroll wheel or two-finger trackpad
- Pinch-to-zoom on trackpad (if enabled by app)
- Force click (deep press) for Quick Look preview on supported content

---

### Drag and Drop

```swift
Text(item.name).draggable(item)

List { ForEach(items) { Text($0.name) } }
    .dropDestination(for: Item.self) { items, _ in
        self.items.append(contentsOf: items); return true
    }
```

Spring-loaded folders: hovering a dragged item over a folder for 1 second auto-opens it.

---

### System Chrome

**Title Bar:** Standard (traffic lights + title + toolbar), Unified (toolbar in title bar, default modern), Hidden (`.windowStyle(.hiddenTitleBar)` for immersive). **Menu Bar:** Always visible except full screen. **Dock:** Badge support via `NSApp.dockTile.badgeLabel`.

---

### Keyboard Handling

**Standard Shortcuts (never override):**
| Shortcut | Action |
|----------|--------|
| Cmd+Q | Quit |
| Cmd+W | Close window/tab |
| Cmd+N/O/S | New/Open/Save |
| Cmd+Z / Cmd+Shift+Z | Undo/Redo |
| Cmd+, | Settings |
| Cmd+C/V/X/A | Copy/Paste/Cut/Select All |
| Cmd+F | Find |

**Escape:** Closes popovers/sheets, cancels operations, exits full screen.

---

### Multi-Window and Documents

```swift
@main struct MyApp: App {
    var body: some Scene {
        DocumentGroup(newDocument: MyDocument()) { file in
            ContentView(document: file.$document)
        }
        Window("Activity Log", id: "activity") { ActivityLogView() }
            .keyboardShortcut("l", modifiers: [.command, .option])
        MenuBarExtra("Status", systemImage: "circle.fill") { StatusMenuView() }
            .menuBarExtraStyle(.window)
    }
}
```

**Window Restoration:**
- macOS automatically saves and restores window positions
- Apps should support state restoration via `@SceneStorage`
- `@SceneStorage("selectedTab") var selectedTab = "general"`

**Stage Manager (macOS Ventura+):**
- Groups windows into "stages" on the side
- Active stage centered, others dimmed at edges
- Apps should handle arbitrary window sizes gracefully
- Test with Stage Manager enabled during development

---

## Dark Mode and Appearance

**System Colors (adapt automatically):**
| Color | Use Case |
|-------|----------|
| `.windowBackgroundColor` | Window background |
| `.controlBackgroundColor` | Text field, list backgrounds |
| `.textColor` / `.secondaryLabelColor` | Primary / secondary text |
| `.separatorColor` | Dividers |
| `.controlAccentColor` | Tint, selection |

**Materials (translucent backgrounds):**
| Material | Use Case |
|----------|----------|
| `.ultraThinMaterial` | Sidebars, overlays |
| `.regularMaterial` | Popovers, panels |
| `.thickMaterial` | Full-window backgrounds |

```swift
@Environment(\.colorScheme) var colorScheme
// Accent color: Color.accentColor resolves to user's system preference
// Reduced transparency: @Environment(\.accessibilityReduceTransparency)
```

---

## Display Considerations

**Retina:** Use SF Symbols (vector), provide @1x/@2x assets, use points not pixels (1pt = 2px on Retina).

**SF Symbols:**
```swift
Image(systemName: "folder.fill")
    .symbolRenderingMode(.hierarchical)
    .font(.system(size: 24))
Image(systemName: "speaker.wave.3.fill", variableValue: volume)
Image(systemName: "arrow.clockwise").symbolEffect(.rotate, isActive: isRefreshing)
```

**External Displays:** Handle different scale factors per display. Never hardcode pixel sizes. Consider sRGB vs P3 color spaces.

**Accessibility:** `@Environment(\.accessibilityReduceMotion)`, `@Environment(\.colorSchemeContrast)` for increased contrast support.

---

*Generated by PDE-OS | Reference Version 1.0*
