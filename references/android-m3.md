# Android Material Design 3 Reference Library

> Curated Material Design 3 patterns for Android platform.
> Loaded via `@` reference from skills using tiered depth selection.
>
> **Version:** 1.0
> **Scope:** Android navigation, components, typography, platform behaviors
> **Ownership:** Shared (HIG, SYS, WFR, MCK)

---

<!-- TIER: essentials -->

## Navigation Patterns

### Bottom Navigation Bar

Primary navigation for top-level destinations on phones.

**Placement:** Bottom of screen, above gesture bar. Elevated surface with tonal elevation.

**Constraints:**
- 3-5 destinations. Fewer than 3: use tabs. More than 5: use navigation drawer.
- Each destination: Material icon + text label (labels always visible).
- Active indicator: Pill shape behind selected icon.

**Compose:**
```kotlin
NavigationBar {
    items.forEachIndexed { index, item ->
        NavigationBarItem(
            icon = { Icon(item.icon, contentDescription = item.label) },
            label = { Text(item.label) },
            selected = selectedIndex == index,
            onClick = { selectedIndex = index }
        )
    }
}
```

**Specs:**
- Bar height: 80dp
- Icon size: 24dp
- Label font: Label Medium (12sp)
- Active indicator: 64x32dp pill, secondary container color
- Elevation: Level 2 (tonal elevation, no shadow in M3)

---

### Navigation Drawer

Side panel for 3+ destinations, often with sections and headers.

**Types:**
- Modal: Overlay with scrim. Phone default. Width: 360dp max.
- Standard: Persistent panel. Tablet/desktop. Width: 360dp.
- Bottom: Sheet-style drawer from bottom. Alternative for phones.

**Compose:**
```kotlin
ModalNavigationDrawer(
    drawerContent = {
        ModalDrawerSheet {
            Text("App Name", modifier = Modifier.padding(16.dp),
                 style = MaterialTheme.typography.titleLarge)
            NavigationDrawerItem(
                icon = { Icon(Icons.Default.Home, contentDescription = null) },
                label = { Text("Home") },
                selected = currentRoute == "home",
                onClick = { navigate("home") }
            )
        }
    }
) { Scaffold { /* content */ } }
```

**Specs:**
- Drawer width: 360dp max, typically 256-360dp
- Item height: 56dp
- Active indicator: Full-width rounded rect, secondary container color
- Corner radius: 0dp (left edge), 16dp (right edge -- modal only)

---

### Top App Bar

Title bar with optional navigation and actions.

**Variants:**

| Variant | Title Position | Scroll Behavior |
|---------|---------------|-----------------|
| Small | Left-aligned, single line | Elevates on scroll |
| Center-aligned | Centered, single line | Elevates on scroll |
| Medium | Left-aligned, expands to 2 lines | Collapses on scroll |
| Large | Left-aligned, large title | Collapses on scroll |

**Compose:**
```kotlin
TopAppBar(
    title = { Text("Page Title") },
    navigationIcon = {
        IconButton(onClick = { openDrawer() }) {
            Icon(Icons.Default.Menu, contentDescription = "Menu")
        }
    },
    actions = {
        IconButton(onClick = { search() }) {
            Icon(Icons.Default.Search, contentDescription = "Search")
        }
    },
    scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
)
```

**Specs:**
- Small/center height: 64dp
- Medium expanded: 112dp
- Large expanded: 152dp
- Title font: Title Large (22sp) for small/center, Headline Small (24sp) for medium/large

---

### Navigation Rail

Vertical navigation for tablets and foldables.

**Placement:** Left edge, above bottom bar if both present.

**Compose:**
```kotlin
NavigationRail(header = {
    FloatingActionButton(onClick = { compose() }) {
        Icon(Icons.Default.Edit, contentDescription = "Compose")
    }
}) {
    items.forEachIndexed { index, item ->
        NavigationRailItem(
            icon = { Icon(item.icon, contentDescription = item.label) },
            label = { Text(item.label) },
            selected = selectedIndex == index,
            onClick = { selectedIndex = index })
    }
}
```

**Specs:**
- Rail width: 80dp
- Icon size: 24dp
- Active indicator: 56x32dp pill
- Optional FAB header at top

---

## Components and Controls

### Buttons

**M3 Button Styles:**

| Style | Appearance | Use For | Compose |
|-------|-----------|---------|---------|
| Filled | Solid primary color | Primary CTA | `Button { }` |
| Outlined | Border, no fill | Secondary actions | `OutlinedButton { }` |
| Text | No border/fill | Tertiary, inline | `TextButton { }` |
| Elevated | Shadow + surface tint | Medium emphasis | `ElevatedButton { }` |
| Tonal | Secondary container fill | Between filled/outlined | `FilledTonalButton { }` |
| FAB | Large floating circle | Primary screen action | `FloatingActionButton { }` |
| Extended FAB | FAB with label | Contextual primary | `ExtendedFloatingActionButton { }` |

**Compose:**
```kotlin
Button(
    onClick = { save() },
    colors = ButtonDefaults.buttonColors(),
    shape = MaterialTheme.shapes.medium
) {
    Icon(Icons.Default.Save, contentDescription = null)
    Spacer(Modifier.width(8.dp))
    Text("Save")
}

FloatingActionButton(
    onClick = { add() },
    containerColor = MaterialTheme.colorScheme.primaryContainer
) {
    Icon(Icons.Default.Add, contentDescription = "Add")
}
```

**Specs:**
- Button height: 40dp
- FAB size: 56dp (standard), 96dp (large), 40dp (small)
- Corner radius: 20dp (button), 16dp (FAB), 28dp (large FAB)
- Min touch target: 48x48dp
- Internal padding: 24dp horizontal, 16dp with icon

---

### Text Fields

**Types:**
- Filled: Solid background, bottom border. Default choice.
- Outlined: Border on all sides, floating label.

**Compose:**
```kotlin
OutlinedTextField(
    value = email,
    onValueChange = { email = it },
    label = { Text("Email") },
    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
    supportingText = { Text("Enter your email address") },
    isError = !isValidEmail(email),
    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
    singleLine = true
)
```

**Specs:**
- Height: 56dp
- Corner radius: 4dp top (filled), 4dp all (outlined)
- Label: Body Large when empty, Body Small when focused/filled
- Supporting text: Body Small, below field
- Error state: Error color on border/label, error icon trailing

---

### Lists

**Item Configurations:**

| Type | Height | Content |
|------|--------|---------|
| One-line | 56dp | Title only |
| Two-line | 72dp | Title + subtitle |
| Three-line | 88dp | Title + subtitle + body |

**Compose:**
```kotlin
LazyColumn {
    items(contacts) { contact ->
        ListItem(
            headlineContent = { Text(contact.name) },
            supportingContent = { Text(contact.email) },
            leadingContent = {
                Icon(Icons.Default.Person, contentDescription = null)
            },
            trailingContent = {
                Checkbox(checked = contact.selected, onCheckedChange = { })
            }
        )
    }
}
```

**Specs:**
- Leading content: 40dp (icon), 56dp (avatar), 40dp (image)
- Horizontal padding: 16dp
- Divider: Optional, full-width or inset from leading content

---

### Chips

| Type | Purpose | Compose |
|------|---------|---------|
| Assist | Smart actions | `AssistChip { }` |
| Filter | Narrow content | `FilterChip { }` |
| Input | User-entered info | `InputChip { }` |
| Suggestion | Dynamic suggestions | `SuggestionChip { }` |

**Compose:**
```kotlin
FilterChip(
    selected = isSelected,
    onClick = { toggle() },
    label = { Text("Vegetarian") },
    leadingIcon = if (isSelected) {
        { Icon(Icons.Default.Check, contentDescription = null) }
    } else null
)
```

**Specs:**
- Height: 32dp
- Corner radius: 8dp
- Spacing between chips: 8dp
- Min touch target: 48dp (padding added automatically)

---

### Switch, Radio, Checkbox

**Compose:**
```kotlin
// Switch
Switch(
    checked = isEnabled,
    onCheckedChange = { isEnabled = it },
    thumbContent = if (isEnabled) {
        { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
    } else null
)

// Radio
RadioButton(selected = option == selected, onClick = { selected = option })

// Checkbox
Checkbox(checked = isChecked, onCheckedChange = { isChecked = it })
```

**Specs:**
- Switch track: 52x32dp. Thumb: 24dp (off), 28dp (on).
- Radio button: 20dp diameter, 48dp touch target.
- Checkbox: 18dp, 48dp touch target.

---

## Typography and Spacing

### Roboto System Font

Android uses Roboto as the default system font.

**M3 Type Scale (15 styles):**

| Role | Size | Weight | Line Height | Tracking |
|------|------|--------|-------------|----------|
| Display Large | 57sp | Regular | 64sp | -0.25sp |
| Display Medium | 45sp | Regular | 52sp | 0sp |
| Display Small | 36sp | Regular | 44sp | 0sp |
| Headline Large | 32sp | Regular | 40sp | 0sp |
| Headline Medium | 28sp | Regular | 36sp | 0sp |
| Headline Small | 24sp | Regular | 32sp | 0sp |
| Title Large | 22sp | Regular | 28sp | 0sp |
| Title Medium | 16sp | Medium | 24sp | 0.15sp |
| Title Small | 14sp | Medium | 20sp | 0.1sp |
| Body Large | 16sp | Regular | 24sp | 0.5sp |
| Body Medium | 14sp | Regular | 20sp | 0.25sp |
| Body Small | 12sp | Regular | 16sp | 0.4sp |
| Label Large | 14sp | Medium | 20sp | 0.1sp |
| Label Medium | 12sp | Medium | 16sp | 0.5sp |
| Label Small | 11sp | Medium | 16sp | 0.5sp |

**Compose:**
```kotlin
Text(
    text = "Headline",
    style = MaterialTheme.typography.headlineMedium,
    color = MaterialTheme.colorScheme.onSurface
)
```

---

### Spacing and Grid

**8dp Baseline Grid:** All spacing and sizing values are multiples of 8dp (4dp for small adjustments).

| Context | Value |
|---------|-------|
| Standard horizontal margin | 16dp (phone), 24dp (tablet) |
| Content padding | 16dp |
| Card internal padding | 16dp |
| Section spacing | 16dp or 24dp |
| Component spacing (tight) | 8dp |
| Component spacing (standard) | 16dp |
| Component spacing (loose) | 24dp |
| Icon to text gap | 8dp |
| Min touch target | 48x48dp |

**Compose:**
```kotlin
Column(
    modifier = Modifier.padding(horizontal = 16.dp),
    verticalArrangement = Arrangement.spacedBy(16.dp)
) {
    // content with consistent spacing
}
```

---

<!-- TIER: standard -->

### Search Bar

**Compose:**
```kotlin
SearchBar(query = searchQuery, onQueryChange = { searchQuery = it },
    onSearch = { performSearch(it) }, active = isSearchActive,
    onActiveChange = { isSearchActive = it },
    placeholder = { Text("Search") },
    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) }
) { /* search suggestions */ }
```

**Specs:**
- Height: 56dp (collapsed), expands to full screen when active
- Corner radius: 28dp (collapsed), 0dp (expanded)
- Background: Surface container high

---

### Date and Time Pickers

**Date Picker:** `DatePickerDialog` wrapping `DatePicker(state = datePickerState)`. Supports modal, docked, and range selection.

**Time Picker:** `TimePicker(state = timePickerState)` for dial mode, `TimeInput(state)` for keyboard input mode.

---

### Bottom Sheets

**Types:**
- Modal: Overlay with scrim. Blocks background interaction.
- Standard: No scrim. Background remains interactive.

**Compose:**
```kotlin
ModalBottomSheet(onDismissRequest = { showSheet = false },
    sheetState = rememberModalBottomSheetState()) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Sheet Title", style = MaterialTheme.typography.titleLarge)
        // Sheet content
    }
}
```

**Specs:**
- Drag handle: 32x4dp, centered, 22dp from top
- Corner radius: 28dp top corners
- Max height: Screen height minus 72dp (top margin)

---

### Snackbar and Dialogs

**Snackbar:**
```kotlin
val snackbarHostState = remember { SnackbarHostState() }
Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { /* content */ }

// Show: scope.launch { snackbarHostState.showSnackbar("Item deleted", "Undo") }
```

**Dialog:**
```kotlin
AlertDialog(onDismissRequest = { showDialog = false },
    title = { Text("Discard draft?") },
    text = { Text("Unsaved changes will be lost.") },
    confirmButton = { TextButton(onClick = { discard() }) { Text("Discard") } },
    dismissButton = { TextButton(onClick = { dismiss() }) { Text("Cancel") } })
```

---

### Progress Indicators

| Type | Compose |
|------|---------|
| Circular indeterminate | `CircularProgressIndicator()` |
| Circular determinate | `CircularProgressIndicator(progress = { 0.6f })` |
| Linear indeterminate | `LinearProgressIndicator()` |
| Linear determinate | `LinearProgressIndicator(progress = { 0.6f })` |

**Specs:**
- Circular size: 48dp (default)
- Linear height: 4dp
- Track color: Surface container highest
- Indicator color: Primary

---

### Layout Patterns

**Scaffold:**
```kotlin
Scaffold(
    topBar = { TopAppBar(title = { Text("Title") }) },
    bottomBar = { NavigationBar { /* items */ } },
    floatingActionButton = {
        FloatingActionButton(onClick = { }) {
            Icon(Icons.Default.Add, contentDescription = "Add")
        }
    }
) { innerPadding ->
    Content(modifier = Modifier.padding(innerPadding))
}
```

**LazyColumn / LazyRow:**
```kotlin
LazyColumn(
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp)
) {
    items(data) { item ->
        ItemCard(item)
    }
}
```

**Adaptive Layout with WindowSizeClass:**
```kotlin
val windowSizeClass = calculateWindowSizeClass(this)

when (windowSizeClass.widthSizeClass) {
    WindowWidthSizeClass.Compact -> PhoneLayout()   // < 600dp
    WindowWidthSizeClass.Medium -> TabletLayout()   // 600-840dp
    WindowWidthSizeClass.Expanded -> DesktopLayout() // > 840dp
}
```

---

### Compose Theme Patterns

**Custom ColorScheme:**
```kotlin
private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF3366E6),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFD6E3FF),
    onPrimaryContainer = Color(0xFF001B3E),
    secondary = Color(0xFF565F71),
    onSecondary = Color(0xFFFFFFFF),
    surface = Color(0xFFFAF9FD),
    onSurface = Color(0xFF1A1B20),
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFFFFF),
    // ... additional M3 color roles: tertiary, containers, outline, surfaceVariant
)
```

**Custom Typography and Shapes:**
```kotlin
private val AppTypography = Typography(
    displayLarge = TextStyle(fontSize = 57.sp, fontWeight = FontWeight.Normal, lineHeight = 64.sp),
    headlineMedium = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold, lineHeight = 36.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal, lineHeight = 24.sp),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, lineHeight = 16.sp),
)

private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp), small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp), large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp),
)
```

**Theme Composable:**
```kotlin
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (darkTheme) dynamicDarkColorScheme(LocalContext.current)
            else dynamicLightColorScheme(LocalContext.current)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    MaterialTheme(colorScheme = colorScheme, typography = AppTypography,
        shapes = AppShapes, content = content)
}
```

---

### Accessibility

**TalkBack Support:**
```kotlin
Icon(
    imageVector = Icons.Default.Favorite,
    contentDescription = "Add to favorites"  // Read by TalkBack
)

// Merge semantics for compound components
Row(modifier = Modifier.semantics(mergeDescendants = true) { }) {
    Icon(Icons.Default.Star, contentDescription = null)
    Text("4.5 stars")
}
```

**Custom Semantics:**
```kotlin
Box(
    modifier = Modifier
        .semantics {
            contentDescription = "Profile picture for ${user.name}"
            role = Role.Image
            stateDescription = if (isOnline) "Online" else "Offline"
        }
        .clickable { openProfile() }
)
```

**Focus Order:** Use `FocusRequester.createRefs()` with `Modifier.focusRequester(ref).focusProperties { next = nextRef }` to control tab order.

**Minimum Touch Target:** 48x48dp for all interactive elements. Compose adds padding automatically to meet this when needed.

---

<!-- TIER: comprehensive -->

## Platform Behaviors

### Ripple and Indication

M3 uses ripple as the default touch feedback.

**Compose:** Ripple applied automatically via `Modifier.clickable { }`. Custom: use `ripple(bounded = true, radius = 40.dp, color = Color.Blue)` as indication parameter.
```

**Specs:**
- Ripple opacity: 12% (light theme), 10% (dark theme)
- Ripple color: Matches content color (onSurface for surfaces)
- Unbounded ripple: Extends beyond component bounds (icon buttons)

---

### Elevation System

M3 uses tonal elevation instead of shadow elevation.

**Tonal Elevation Levels:**

| Level | Elevation | Surface Tint | Use For |
|-------|-----------|-------------|---------|
| Level 0 | 0dp | None | Default surface |
| Level 1 | 1dp | 5% primary | Cards, navigation |
| Level 2 | 3dp | 8% primary | Elevated cards, bottom bar |
| Level 3 | 6dp | 11% primary | FAB, navigation drawer |
| Level 4 | 8dp | 12% primary | Menus, dialogs |
| Level 5 | 12dp | 14% primary | Dragged items |

**Compose:**
```kotlin
Surface(
    tonalElevation = 3.dp,
    shadowElevation = 0.dp,  // Shadow optional in M3
    shape = MaterialTheme.shapes.medium
) {
    // Content gets tonal color shift
}
```

---

### System Bars

**Status Bar:**
- Height: 24dp (standard), varies by device
- Transparent or system default background
- Light or dark icons based on content behind

**Navigation Bar:**
- Gesture navigation: 48dp transparent area, swipe from bottom
- 3-button navigation: 48dp with back/home/recent buttons
- Edge-to-edge: Content extends behind both bars

**Compose (Edge-to-Edge):**
```kotlin
// In Activity.onCreate: enableEdgeToEdge()
// In Compose: Scaffold handles insets via innerPadding
Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
    Column(modifier = Modifier.padding(innerPadding)) { /* content */ }
}
// Manual: Modifier.windowInsetsPadding(WindowInsets.systemBars)
```

---

### Back Gesture (Predictive Back)

Android 13+ supports predictive back animation.

**Compose:**
```kotlin
// Handle back with callback
BackHandler(enabled = true) {
    // Custom back behavior
    if (showDetails) showDetails = false
    else navigator.popBackStack()
}
```

**Predictive Back Animations:**
- System default: Screen shrinks and shows previous destination
- Custom: Register `OnBackPressedCallback` with animation logic
- Material3 components (sheets, drawers) support predictive back automatically

---

### Keyboard Handling

**Compose:** Use `Modifier.windowInsetsPadding(WindowInsets.ime)` to shift content above keyboard. Use `BringIntoViewRequester` on focused fields to auto-scroll into view.

---

### Motion System

**Material Motion Patterns:**

| Pattern | Use For | Duration |
|---------|---------|----------|
| Container transform | Item to detail transition | 300ms |
| Shared axis | Lateral navigation (tabs, steps) | 300ms |
| Fade through | Unrelated content switch | 300ms |
| Fade | Simple appear/disappear | 150ms (in), 75ms (out) |

**Compose Animation:**
```kotlin
AnimatedVisibility(visible = isVisible,
    enter = fadeIn() + slideInVertically(),
    exit = fadeOut() + slideOutVertically()
) { Card { /* content */ } }

AnimatedContent(targetState = selectedTab) { tab ->
    when (tab) { Tab.Home -> HomeScreen(); Tab.Profile -> ProfileScreen() }
}
```

**Shared Element (Compose 1.7+):** Use `SharedTransitionLayout` with `Modifier.sharedElement(rememberSharedContentState(key), animatedVisibilityScope)` for hero transitions.

---

### Swipe-to-Dismiss

**Compose:**
```kotlin
val dismissState = rememberSwipeToDismissBoxState()
SwipeToDismissBox(state = dismissState,
    backgroundContent = {
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.error),
            contentAlignment = Alignment.CenterEnd) {
            Icon(Icons.Default.Delete, contentDescription = "Delete",
                 modifier = Modifier.padding(16.dp))
        }
    }
) { ListItem(headlineContent = { Text("Swipe me") }) }
```

---

### Dark Mode and Dynamic Color

**Dynamic Color (Material You):**
- Android 12+ extracts colors from user's wallpaper
- Generates full M3 tonal palette from seed color
- `dynamicLightColorScheme(context)` / `dynamicDarkColorScheme(context)`
- Falls back to custom color scheme on older devices

**Custom Dark Scheme:** Use `darkColorScheme(...)` with inverted tones -- lighter content colors on darker surface colors. Each color role generates 13 tones (0-100).

---

### Device-Specific Considerations

**WindowSizeClass:**

| Class | Width | Typical Device |
|-------|-------|---------------|
| Compact | < 600dp | Phone portrait |
| Medium | 600-840dp | Tablet portrait, foldable |
| Expanded | > 840dp | Tablet landscape, desktop |

**Large Screen Canonical Layouts:**

| Layout | Use For | Structure |
|--------|---------|-----------|
| List-detail | Master-detail views | List pane (300-400dp) + detail pane |
| Supporting panel | Reference content | Main pane + side panel (360dp) |
| Feed | Social/content streams | Multi-column grid |

**Compose Adaptive Layout:** Use `calculateWindowSizeClass(this)` and switch navigation: Compact = bottom nav, Medium = navigation rail, Expanded = permanent drawer + list-detail scaffold.

**Foldable:** Detect fold state via `WindowInfoTracker`. Table-top mode: content top, controls bottom. Avoid interactive elements on fold/hinge.

**Multi-Window:** Support minimum 220x220dp window size. Save/restore state for configuration changes.
