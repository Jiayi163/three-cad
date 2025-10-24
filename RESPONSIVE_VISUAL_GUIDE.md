# 📱 Visual Layout Guide

## Layout Transformations Across Screen Sizes

This guide shows how the CAD Studio layout adapts across different screen sizes.

---

## 📱 Mobile Layout (< 768px)

### Visual Structure
```
┌───────────────────────────────┐
│ ☰  📐 CAD Studio         ⚫ │  ← Menu bar (32px) with hamburger
├───────────────────────────────┤
│ 📦🎨⚡🔧✏️📐🔲 ▶▶▶ │  ← Scrollable toolbar (48px)
├───────────────────────────────┤
│                               │
│                               │
│        3D Viewport            │
│       (Full Width)            │
│                               │
│                               │
│                               │
│                               │
├───────────────────────────────┤
│ Ready │ Objects: 3 │ 60 FPS  │  ← Status bar (24px)
└───────────────────────────────┘
```

### With Panel Open (Overlay)
```
┌───────────────────────────────┐
│ ☰  📐 CAD Studio         ⚫ │
├───────────────────────────────┤
│ 📦🎨⚡🔧✏️📐🔲 ▶▶▶ │
├───────────────────────────────┤
│ [Backdrop]        ┌─────────┐ │
│                   │Properties│ │
│                   │  ┌─────┐│ │
│                   │  │Name │││ │  ← Overlay panel
│                   │  │Color│││ │     (slides from right)
│                   │  │Size │││ │
│                   │  └─────┘││ │
│                   │      [X]││ │
│                   └─────────┘ │
├───────────────────────────────┤
│ Ready │ Objects: 3 │ 60 FPS  │
└───────────────────────────────┘
```

### Features
- ☰ **Hamburger menu** for navigation
- **Horizontal scrolling** toolbar
- **Overlay panels** slide in from side
- **Backdrop** dims background
- **Full-width viewport**
- **Touch-friendly** (44px+ buttons)

---

## 📱 Tablet Layout (768px - 1023px)

### Visual Structure
```
┌─────────────────────────────────────────┐
│ ☰ 📐 CAD Studio   File Edit View Create│  ← Compact menu (32px)
├─────────────────────────────────────────┤
│ 📦 🎨 Materials ⚡ 🔧 ✏️ 📐 🔲 🔵│  ← Full toolbar (42px)
├─────────────────────────────────────────┤
│                                         │
│                                         │
│           3D Viewport                   │
│         (Most of width)                 │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ Ready │ Objects: 3 │ Selected: 1│60 FPS│  ← Status bar (24px)
└─────────────────────────────────────────┘
```

### With Panel Open (Can be Overlay or Docked)
```
┌─────────────────────────────────────────┐
│ ☰ 📐 CAD Studio   File Edit View Create│
├─────────────────────────────────────────┤
│ 📦 🎨 Materials ⚡ 🔧 ✏️ 📐 🔲 📋│
├─────────────────────────────────────────┤
│                     │ Properties        │
│                     │ ┌───────────────┐ │
│   3D Viewport       ││Name: Box1      │ │
│   (Adjusted)        ││Color: Blue     │ │  ← Docked panel
│                     ││Size: 10x10x10  │ │     (resizable)
│                     ││Position: 0,0,0 │ │
│                     │└───────────────┘ │
├─────────────────────────────────────────┤
│ Ready │ Objects: 3 │ Selected: 1│60 FPS│
└─────────────────────────────────────────┘
```

### Features
- **Compact menu bar** with essential items
- **Full toolbar** visible (no scrolling)
- **Flexible panels** (overlay or docked)
- **Button labels** on some items
- **Resizable panels** (if docked)

---

## 💻 Desktop Layout (1024px - 1439px)

### Visual Structure
```
┌───────────────────────────────────────────────────────┐
│ 📐 CAD Studio    File  Edit  View  Create     Ready ⚫│  ← Full menu (32px)
├───────────────────────────────────────────────────────┤
│ 📦 🎨 Materials ⚡ 🔧 ✏️ 📐 🔲 │ 🌄 Scene │ 📋 │  ← Full toolbar (42px)
├───────────────────────────────────────────────────────┤
│                                    │  Properties      │
│                                    │ ┌──────────────┐ │
│                                    ││ Name: Box1    │ │
│           3D Viewport              ││ Color: Blue   │ │
│          (Main area)               ││ Size: 10x10x10│ │  ← Docked panel
│                                    ││ Position: 0,0 │ │     (resizable)
│                                    ││               │ │
│                                    │└──────────────┘ │
│                                    │ [Content...]   │ │
├───────────────────────────────────────────────────────┤
│ Ready │ Objects: 3 │ Selected: 1 │ Camera: ISO │60fps│  ← Status bar (24px)
└───────────────────────────────────────────────────────┘
```

### With Floating Panels
```
┌───────────────────────────────────────────────────────┐
│ 📐 CAD Studio    File  Edit  View  Create     Ready ⚫│
├───────────────────────────────────────────────────────┤
│ 📦 🎨 Materials ⚡ 🔧 ✏️ 📐 🔲 │ 🌄 Scene │ 📋 │
├───────────────────────────────────────────────────────┤
│                    ┌────────┐     │  Properties      │
│                    │Materials│     │ ┌──────────────┐ │
│                    │🔴 Red   │     ││ Name: Box1    │ │
│     3D Viewport    │🔵 Blue  │     ││ Color: Blue   │ │
│                    │🟢 Green │     ││ Size: 10x10x10│ │
│                    │🟡 Yellow│     │└──────────────┘ │
│                    └────────┘     │                  │
├───────────────────────────────────────────────────────┤
│ Ready │ Objects: 3 │ Selected: 1 │ Camera: ISO │60fps│
└───────────────────────────────────────────────────────┘
```

### Features
- **Full menu bar** with all options
- **Full toolbar** with labels
- **Docked panels** with resize handles
- **Floating panels** for materials/scene
- **Spacious layout**
- **Mouse-optimized** interactions

---

## 🖥️ Large Desktop Layout (≥ 1440px)

### Visual Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│ 📐 CAD Studio    File  Edit  View  Create  Tools       Ready    ⚫ │  ← Full menu (32px)
├─────────────────────────────────────────────────────────────────────┤
│ 📦 🎨 Materials 🌄 Scene ⚡ 🔧 ✏️ 📐 🔲 🔵 🔺 ⭕  │  Zoom  F T I│  ← Extended toolbar (42px)
├─────────────────────────────────────────────────────────────────────┤
│                                                │  Properties         │
│                                                │ ┌─────────────────┐ │
│                                                ││ Object Details  │ │
│                                                ││ Name: Box1       │ │
│               3D Viewport                      ││ Type: Geometry   │ │
│              (Maximum space)                   ││ Color: #0066FF   │ │  ← Wide panel
│                                                ││ Dimensions:      │ │    (up to 600px)
│                                                ││  Width: 10.00    │ │
│                                                ││  Height: 10.00   │ │
│                                                ││  Depth: 10.00    │ │
│                                                ││ Position (XYZ):  │ │
│                                                ││  X: 0.00         │ │
│                                                │└─────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ Ready │ Objects: 3 │ Selected: 1 │ Camera: ISO │ FPS: 60 │ Mem: 45MB│  ← Detailed status (24px)
└─────────────────────────────────────────────────────────────────────┘
```

### Features
- **Maximum feature visibility**
- **Wide panels** (up to 600px)
- **All labels visible**
- **Extended status bar**
- **Optimal spacing**
- **Professional layout**

---

## 🔄 Resize Behavior

### Smooth Transitions

When resizing from **Large → Desktop → Tablet → Mobile**:

1. **1440px → 1024px (Large → Desktop)**
   ```
   - Panel width reduces from 600px max to 450px max
   - Layout remains similar
   - All features still accessible
   ```

2. **1024px → 768px (Desktop → Tablet)**
   ```
   - Menu becomes more compact
   - Panels may switch to overlay mode
   - Some labels hide
   - Toolbar remains fully visible
   ```

3. **768px → 480px (Tablet → Mobile)**
   ```
   - Hamburger menu appears
   - All panels become overlays
   - Toolbar becomes scrollable
   - Touch-friendly sizing applied
   ```

### Panel Resize Animation

```
Desktop Panel Resize:
┌────────┐        ┌──────────┐        ┌────────────┐
│ Narrow │  -→    │  Medium  │  -→    │    Wide    │
│  200px │        │   300px  │        │   450px    │
└────────┘        └──────────┘        └────────────┘
    ↑                                        ↑
    └────────── Drag handle ─────────────────┘
                  (smooth transition)
```

---

## 🎯 Layout Mode Indicator

### Visual Appearance

**Mobile Mode:**
```
┌─────────────┐
│ 📱 Mobile   │  ← Red badge
│   480px     │
└─────────────┘
```

**Tablet Mode:**
```
┌─────────────┐
│ 📱 Tablet   │  ← Yellow badge
│   800px     │
└─────────────┘
```

**Desktop Mode:**
```
┌─────────────┐
│ 💻 Desktop  │  ← Green badge
│  1280px     │
└─────────────┘
```

**Large Mode:**
```
┌──────────────────┐
│ 🖥️ Large Desktop│  ← Blue badge
│     1920px       │
└──────────────────┘
```

---

## 🎨 Color Coding

### Panel States
- **🔴 Closed** - Gray, semi-transparent
- **🟡 Opening** - Animating, semi-visible
- **🟢 Open** - Fully visible, interactive
- **🔵 Active** - Selected/focused state

### Layout Modes
- **🔴 Mobile** - Red indicator (< 768px)
- **🟡 Tablet** - Yellow indicator (768-1023px)
- **🟢 Desktop** - Green indicator (1024-1439px)
- **🔵 Large** - Blue indicator (≥ 1440px)

---

## 📏 Measurements Quick Reference

### Heights
```
Menu Bar:       32px
Toolbar:        42px (desktop) / 48px (mobile)
Status Bar:     24px
Panel Header:   32px
```

### Widths
```
Mobile Panel:   280px - 90vw
Tablet Panel:   200px - 400px (overlay) / 350px (docked)
Desktop Panel:  200px - 450px
Large Panel:    250px - 600px
```

### Spacing
```
Button Gap (Desktop):  4px
Button Gap (Mobile):   2px
Panel Padding:         12px
Section Margin:        16px
```

### Touch Targets
```
Minimum Button Size:   44px × 44px
Comfortable Size:      48px × 48px
Desktop Size:          36px × 36px
```

---

## 🎬 Animation Timings

```
Panel Slide-in:     0.3s ease-out
Panel Fade-in:      0.2s ease-out
Width Transition:   0.2s ease
Menu Dropdown:      0.2s ease-out
Backdrop Fade:      0.2s ease-out
```

---

## 💡 Pro Tips

### For Best Experience

**On Mobile:**
- Use landscape mode for more space
- Swipe toolbar to access all tools
- Tap backdrop to quickly close panels

**On Tablet:**
- Try both portrait and landscape
- Resize panels to your preference
- Use split-screen if supported

**On Desktop:**
- Drag panel borders for custom widths
- Use keyboard shortcuts for efficiency
- Full-screen mode for maximum viewport

**On Large Screens:**
- Utilize the extra space
- Keep multiple panels open
- Consider dual-monitor setup

---

This visual guide helps you understand how the layout adapts at different screen sizes! 🎉

