# iOS HIG Reference Library

> Curated Apple Human Interface Guidelines patterns for iOS platform.
> Loaded via `@` reference from skills using tiered depth selection.
>
> **Version:** 1.0
> **Scope:** iOS navigation, components, typography, platform behaviors
> **Ownership:** Shared (HIG, SYS, WFR, MCK)

---

<!-- TIER: essentials -->

## Navigation Patterns

### Tab Bar

Primary navigation for top-level destinations on iPhone and iPad.

**Placement:** Bottom of screen, always visible. Translucent background with blur.

**Constraints:**
- iPhone: Max 5 tabs. If more, last tab becomes "More" with table view.
- iPad: Tab bar can appear at top (iPadOS 18+) as a sidebar-style tab bar.
- Each tab: SF Symbol icon (filled variant when selected) + short text label.

**SwiftUI:**
```swift
TabView {
    HomeView()
        .tabItem {
            Label("Home", systemImage: "house.fill")
        }
    SearchView()
        .tabItem {
            Label("Search", systemImage: "magnifyingglass")
        }
    ProfileView()
        .tabItem {
            Label("Profile", systemImage: "person.fill")
        }
}
```

**Specs:**
- Tab bar height: 49pt (iPhone), 50pt (iPad)
- Icon size: 25x25pt (regular), 18x18pt (compact)
- Label font: SF Pro Text, 10pt medium
- Selected tint: App accent color. Unselected: secondary label color.

---

### Navigation Bar

Hierarchical navigation with back button and title.

**Title Styles:**
- Large title: 34pt bold, collapses on scroll. Use for top-level views.
- Standard title: 17pt semibold, centered. Use for pushed views.
- Inline title: 17pt semibold, left-aligned with back button.

**SwiftUI:**
```swift
NavigationStack {
    List { /* content */ }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Edit") { /* action */ }
            }
        }
}
```

**Specs:**
- Navigation bar height: 44pt (standard), 96pt (large title expanded)
- Back button: Chevron icon + previous view title (auto-truncated)
- Bar button items: 44x44pt minimum touch target

---

### Modal Presentation

Overlay content that interrupts the current flow.

**Sheet (default):** Partial-height card with drag indicator. Dismiss by swiping down.
- `.sheet(isPresented:)` -- standard presentation
- Detents: `.medium` (half screen), `.large` (full minus status bar), custom fraction

**Fullscreen Cover:** Full-screen overlay. Requires explicit dismiss button.
- `.fullScreenCover(isPresented:)` -- blocks underlying content

**Popover:** Floating panel anchored to a point. iPad primarily; iPhone falls back to sheet.
- `.popover(isPresented:)` -- arrow points to source

**SwiftUI:**
```swift
.sheet(isPresented: $showSettings) {
    SettingsView()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
}
```

---

### Split View (iPad)

Two or three column layout for iPad and large screens.

**Patterns:**
- Two-column: Sidebar (320pt) + Detail
- Three-column: Sidebar (320pt) + Content (375pt) + Detail
- Sidebar collapses in compact width (iPhone falls back to NavigationStack)

**SwiftUI:**
```swift
NavigationSplitView {
    SidebarView()
} detail: {
    DetailView()
}
.navigationSplitViewStyle(.balanced)
```

---

## Components and Controls

### Buttons

**System Styles:**

| Style | Appearance | Use For |
|-------|-----------|---------|
| `.bordered` | Rounded rect, tinted fill | Secondary actions |
| `.borderedProminent` | Rounded rect, accent fill, white label | Primary actions |
| `.borderless` | Text only, accent color | Inline/toolbar actions |
| `.plain` | No styling | Custom button appearance |

**SwiftUI:**
```swift
Button("Save") { save() }
    .buttonStyle(.borderedProminent)
    .controlSize(.large)  // .mini, .small, .regular, .large, .extraLarge

Button(role: .destructive) { delete() }
    .buttonStyle(.bordered)  // Red tint for destructive role
```

**Specs:**
- Minimum touch target: 44x44pt
- Corner radius: 12pt (large), 8pt (regular), 6pt (small)
- Control sizes: mini (22pt), small (28pt), regular (34pt), large (44pt), extraLarge (54pt)

---

### Text Fields

**Styles:**
- `.roundedBorder` -- Standard text field with rounded rect border
- `.plain` -- No border, used inside forms

**SwiftUI:**
```swift
TextField("Email", text: $email)
    .textFieldStyle(.roundedBorder)
    .textContentType(.emailAddress)
    .keyboardType(.emailAddress)
    .autocorrectionDisabled()

SecureField("Password", text: $password)
    .textContentType(.password)
```

**Specs:**
- Height: 36pt (standard)
- Corner radius: 8pt
- Padding: 8pt horizontal
- Clear button: Appears when text is present and field is focused

---

### Lists

Primary content display pattern for iOS.

**Styles:**
- `.insetGrouped` -- Rounded cards with section headers (Settings-style). Default.
- `.grouped` -- Full-width sections with headers.
- `.plain` -- No section styling, minimal dividers.

**SwiftUI:**
```swift
List {
    Section("Account") {
        NavigationLink("Profile") { ProfileView() }
        NavigationLink("Notifications") { NotificationsView() }
    }
    Section("Preferences") {
        Toggle("Dark Mode", isOn: $darkMode)
        Picker("Language", selection: $lang) { /* options */ }
    }
}
.listStyle(.insetGrouped)
```

**Swipe Actions:**
```swift
.swipeActions(edge: .trailing) {
    Button(role: .destructive) { delete(item) } label: {
        Label("Delete", systemImage: "trash")
    }
}
.swipeActions(edge: .leading) {
    Button { archive(item) } label: {
        Label("Archive", systemImage: "archivebox")
    }
    .tint(.blue)
}
```

---

### Pickers

| Type | Use For | SwiftUI |
|------|---------|---------|
| Wheel | Slot machine-style scrolling values | `.pickerStyle(.wheel)` |
| Compact | Inline collapsed, expands on tap | `.pickerStyle(.menu)` |
| Segmented | 2-5 mutually exclusive options | `.pickerStyle(.segmented)` |
| Date | Date/time selection | `DatePicker("Date", selection: $date)` |

---

### Toggle and Switch

**SwiftUI:**
```swift
Toggle("Airplane Mode", isOn: $airplaneMode)
    .tint(.green)  // Custom tint color (default is green)
```

**Specs:**
- Track: 51x31pt
- Thumb: 27x27pt circle
- Default on color: System green (#34C759)

---

### Segmented Control

2-5 options, mutually exclusive selection. Commonly used in toolbars and below navigation bars.

**SwiftUI:**
```swift
Picker("View", selection: $viewMode) {
    Text("List").tag(ViewMode.list)
    Text("Grid").tag(ViewMode.grid)
}
.pickerStyle(.segmented)
```

---

## Typography and Spacing

### SF Pro System Font

iOS uses SF Pro as the system font. No need to bundle -- always available.

**Dynamic Type Scale (12 size categories):**

| Style | Default Size | Weight | Use For |
|-------|-------------|--------|---------|
| `.largeTitle` | 34pt | Regular | Screen titles |
| `.title` | 28pt | Regular | Section headers |
| `.title2` | 22pt | Regular | Subsection headers |
| `.title3` | 20pt | Regular | Tertiary headers |
| `.headline` | 17pt | Semibold | Emphasized body text |
| `.body` | 17pt | Regular | Primary content |
| `.callout` | 16pt | Regular | Secondary content |
| `.subheadline` | 15pt | Regular | Captions, metadata |
| `.footnote` | 13pt | Regular | Fine print |
| `.caption` | 12pt | Regular | Labels, timestamps |
| `.caption2` | 11pt | Regular | Smallest readable text |

**Dynamic Type Categories:** xSmall, Small, Medium, Large (default), xLarge, xxLarge, xxxLarge, AX1, AX2, AX3, AX4, AX5

**SwiftUI:**
```swift
Text("Hello")
    .font(.headline)  // Automatically scales with Dynamic Type

// Custom font that scales:
@ScaledMetric var iconSize: CGFloat = 24
Image(systemName: "star")
    .frame(width: iconSize, height: iconSize)
```

---

### Safe Areas and Insets

**iPhone Safe Areas:**
- Top: 59pt (notch/Dynamic Island) or 47pt (status bar only)
- Bottom: 34pt (home indicator) or 0pt (home button models)
- Left/Right: 0pt portrait, varies in landscape

**Dynamic Island (iPhone 14 Pro+):**
- Expanded width: 126.66pt (compact), 351pt (expanded)
- Keep content clear of Dynamic Island region

**SwiftUI:**
```swift
VStack { /* content */ }
    .ignoresSafeArea(.container, edges: .top)  // Extend behind status bar
    .safeAreaInset(edge: .bottom) {
        BottomBar()  // Pinned above home indicator
    }
```

---

### Margins and Padding

| Context | Value |
|---------|-------|
| Standard horizontal margin | 16pt (iPhone), 20pt (iPad) |
| Content padding | 16pt |
| Section spacing | 20pt (grouped list), 35pt (between sections) |
| Card internal padding | 16pt |
| Minimum touch target | 44x44pt |

---

<!-- TIER: standard -->

### Search Bar

Full-width search with optional scope bar.

**SwiftUI:**
```swift
NavigationStack {
    List { /* results */ }
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always))
        .searchScopes($scope) {
            Text("All").tag(SearchScope.all)
            Text("Recent").tag(SearchScope.recent)
        }
}
```

**Specs:**
- Height: 36pt (field) + 28pt (scope bar if present)
- Corner radius: 10pt
- Background: Tertiary system fill
- Cancel button appears on focus

---

### Context Menus

Long-press to reveal contextual actions with preview.

**SwiftUI:**
```swift
Image("photo")
    .contextMenu {
        Button { share() } label: {
            Label("Share", systemImage: "square.and.arrow.up")
        }
        Button(role: .destructive) { delete() } label: {
            Label("Delete", systemImage: "trash")
        }
    } preview: {
        PhotoPreview(image: photo)  // Custom preview
    }
```

---

### Action Sheets vs Alerts

| Type | Use For | Presentation |
|------|---------|-------------|
| Alert | Critical decisions, confirmations | Center of screen, 1-2 buttons |
| Action Sheet | Multiple options from a trigger | Bottom sheet (iPhone), popover (iPad) |
| Confirmation Dialog | Destructive action confirmation | Bottom sheet with cancel |

**SwiftUI:**
```swift
// Alert
.alert("Delete Account?", isPresented: $showAlert) {
    Button("Cancel", role: .cancel) { }
    Button("Delete", role: .destructive) { deleteAccount() }
} message: {
    Text("This action cannot be undone.")
}

// Confirmation Dialog (Action Sheet replacement)
.confirmationDialog("Options", isPresented: $showOptions) {
    Button("Share") { share() }
    Button("Duplicate") { duplicate() }
    Button("Delete", role: .destructive) { delete() }
}
```

---

### Progress Indicators

| Type | When | SwiftUI |
|------|------|---------|
| Circular (indeterminate) | Unknown duration | `ProgressView()` |
| Circular (determinate) | Known progress | `ProgressView(value: 0.6)` |
| Linear | File transfers, downloads | `ProgressView(value: 0.6).progressViewStyle(.linear)` |

---

### Scroll Views

**Pull-to-Refresh:**
```swift
List { /* content */ }
    .refreshable {
        await loadData()
    }
```

**Scroll Position Tracking:**
```swift
ScrollView {
    LazyVStack { /* content */ }
}
.scrollPosition(id: $scrolledID)
```

---

### Layout Patterns

**LazyVStack / LazyHStack:** Load content on demand for performance.
```swift
ScrollView {
    LazyVStack(spacing: 12) {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
    .padding(.horizontal, 16)
}
```

**Grid Layout:**
```swift
LazyVGrid(columns: [
    GridItem(.adaptive(minimum: 150), spacing: 16)
], spacing: 16) {
    ForEach(items) { item in
        ItemCard(item: item)
    }
}
.padding(16)
```

**Form Pattern (Settings-style):**
```swift
Form {
    Section("General") {
        TextField("Name", text: $name)
        DatePicker("Birthday", selection: $birthday, displayedComponents: .date)
    }
    Section("Privacy") {
        Toggle("Analytics", isOn: $analytics)
    }
}
```

---

### SwiftUI Code Patterns

**Color Extensions:**
```swift
extension Color {
    static let appPrimary = Color("AppPrimary")
    static let appSecondary = Color("AppSecondary")
    static let appBackground = Color("AppBackground")
    static let appSurface = Color("AppSurface")
}
```

**Font Extensions with Dynamic Type:**
```swift
extension Font {
    static let appHeadline = Font.system(.title2, design: .default, weight: .bold)
    static let appBody = Font.system(.body, design: .default, weight: .regular)
    static let appCaption = Font.system(.caption, design: .default, weight: .medium)
}
```

**ViewModifier Pattern:**
```swift
struct AppCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(Color.appSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
    }
}

extension View {
    func appCard() -> some View { modifier(AppCardModifier()) }
}
```

**@ScaledMetric for Custom Values:**
```swift
struct IconView: View {
    @ScaledMetric(relativeTo: .body) var iconSize: CGFloat = 24
    @ScaledMetric(relativeTo: .body) var padding: CGFloat = 8

    var body: some View {
        Image(systemName: "star.fill")
            .frame(width: iconSize, height: iconSize)
            .padding(padding)
    }
}
```

---

### Accessibility

**VoiceOver:**
```swift
Button { toggleFavorite() } label: {
    Image(systemName: isFavorite ? "heart.fill" : "heart")
}
.accessibilityLabel(isFavorite ? "Remove from favorites" : "Add to favorites")
.accessibilityHint("Double tap to toggle")
.accessibilityAddTraits(.isButton)
```

**Rotor Actions:**
```swift
Text(article.title)
    .accessibilityAction(named: "Bookmark") { bookmark(article) }
    .accessibilityAction(named: "Share") { share(article) }
```

**Dynamic Type with @ScaledMetric:**
```swift
@ScaledMetric var spacing: CGFloat = 8
@ScaledMetric var minHeight: CGFloat = 44

HStack(spacing: spacing) { /* content */ }
    .frame(minHeight: minHeight)
```

**Minimum Touch Targets:** 44x44pt for all interactive elements. SwiftUI buttons meet this by default; custom tap areas may need `.frame(minWidth: 44, minHeight: 44)`.

---

<!-- TIER: comprehensive -->

## Platform Behaviors

### Gesture System

| Gesture | Use For | SwiftUI |
|---------|---------|---------|
| Tap | Primary action | `.onTapGesture { }` |
| Long Press | Context menu, secondary action | `.onLongPressGesture { }` |
| Swipe | List actions, navigation | `.swipeActions { }` |
| Drag | Reordering, moving | `DragGesture()` |
| Pinch | Zoom | `MagnifyGesture()` |
| Rotate | Rotation | `RotateGesture()` |

**Gesture Composition:**
```swift
Image("photo")
    .gesture(
        MagnifyGesture()
            .simultaneously(with: RotateGesture())
            .onChanged { value in
                scale = value.first?.magnification ?? 1.0
                angle = value.second?.rotation ?? .zero
            }
    )
```

**Edge Swipe:** System-reserved. Left edge = back navigation. Do not override.

---

### Haptic Feedback

**UIImpactFeedbackGenerator:**

| Style | Use For |
|-------|---------|
| `.light` | Subtle confirmation (toggle) |
| `.medium` | Selection changes (picker) |
| `.heavy` | Significant actions (drop) |
| `.rigid` | Firm, precise feedback |
| `.soft` | Gentle, cushioned feedback |

**SwiftUI:**
```swift
Button("Submit") {
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    submit()
}
```

**UINotificationFeedbackGenerator:** `.success`, `.warning`, `.error`

---

### System Chrome

**Status Bar:**
- Light content (white) or dark content (black), auto-adapts to background
- Height: 54pt (Dynamic Island), 47pt (notch), 20pt (legacy)

**Home Indicator:**
- 5pt tall bar at bottom, 134pt wide
- Auto-hides during media playback
- `.persistentSystemOverlays(.hidden)` to auto-hide

---

### Keyboard Handling

**Keyboard Avoidance:** SwiftUI automatically adjusts layout when keyboard appears.

**Custom Toolbar:**
```swift
TextField("Note", text: $note)
    .toolbar {
        ToolbarItemGroup(placement: .keyboard) {
            Spacer()
            Button("Done") { focused = false }
        }
    }
```

**Dismiss Keyboard:**
```swift
ScrollView { }
    .scrollDismissesKeyboard(.interactively)  // Drag to dismiss
```

---

### App Lifecycle

**SwiftUI Scene Phases:**
```swift
@Environment(\.scenePhase) var scenePhase

.onChange(of: scenePhase) { _, newPhase in
    switch newPhase {
    case .active: refreshData()
    case .inactive: saveState()
    case .background: scheduleBackgroundTask()
    @unknown default: break
    }
}
```

---

### Deep Linking

**SwiftUI:**
```swift
WindowGroup {
    ContentView()
        .onOpenURL { url in
            router.handle(url)
        }
}
```

**Universal Links:** Requires `apple-app-site-association` file on web server.

---

### Custom Transitions

**Built-in:**
```swift
.transition(.slide)
.transition(.opacity)
.transition(.scale)
.transition(.move(edge: .bottom))
.transition(.asymmetric(insertion: .slide, removal: .opacity))
```

**Matched Geometry Effect (Hero Animations):**
```swift
@Namespace var animation

// Source
Image("photo")
    .matchedGeometryEffect(id: photo.id, in: animation)

// Destination
Image("photo")
    .matchedGeometryEffect(id: photo.id, in: animation)
```

**Navigation Transition:**
```swift
NavigationLink(value: item) { ItemRow(item: item) }
    .navigationTransition(.zoom(sourceID: item.id, in: namespace))
```

---

### Dark Mode

**System Adaptive Colors:**

| Semantic Color | Light | Dark | Use For |
|---------------|-------|------|---------|
| `.label` | Black | White | Primary text |
| `.secondaryLabel` | Gray (60%) | Gray (60%) | Secondary text |
| `.tertiaryLabel` | Gray (30%) | Gray (30%) | Tertiary text |
| `.systemBackground` | White | Black | Primary background |
| `.secondarySystemBackground` | #F2F2F7 | #1C1C1E | Grouped content |
| `.tertiarySystemBackground` | White | #2C2C2E | Elevated surfaces |
| `.separator` | #C6C6C8 | #38383A | Divider lines |
| `.systemFill` | #787880 (20%) | #787880 (36%) | Fill areas |

**Elevated Appearances:** In dark mode, surfaces at higher elevation use lighter backgrounds. System handles automatically for standard components.

**SwiftUI:**
```swift
// Respond to color scheme
@Environment(\.colorScheme) var colorScheme

// Force a specific scheme
VStack { }
    .preferredColorScheme(.dark)

// Custom adaptive colors
extension Color {
    static let appCard = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1)
            : UIColor(red: 1, green: 1, blue: 1, alpha: 1)
    })
}
```

---

### Device-Specific Considerations

**iPhone vs iPad Sizing:**

| Property | iPhone | iPad | iPad Mini |
|----------|--------|------|-----------|
| Min width (portrait) | 320pt | 768pt | 744pt |
| Standard margin | 16pt | 20pt | 20pt |
| Tab bar | Bottom, 49pt | Top/sidebar (iPadOS 18+) | Bottom, 49pt |
| Split view | No | Yes (2-3 columns) | Yes (limited) |
| Popover | Falls back to sheet | Native popover | Native popover |

**Size Classes:**
```swift
@Environment(\.horizontalSizeClass) var hSize
@Environment(\.verticalSizeClass) var vSize

// Compact width = iPhone portrait, iPad slide over
// Regular width = iPad, iPhone landscape (some)
```

**Landscape Considerations:**
- iPhone landscape: Compact height, navigation bar shrinks
- iPad landscape: More horizontal space, split view wider
- Bottom tab bar remains visible in landscape on iPhone

**Stage Manager (iPad):**
- App windows can be resized freely
- Support all size classes for Stage Manager compatibility
- Test at minimum window size (iPhone-equivalent)
