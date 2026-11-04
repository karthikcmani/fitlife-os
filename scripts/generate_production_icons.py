"""
FITLIFE OS — Official Production App Icon & Asset Generator
Generates:
- Master vector SVGs (full, foreground, monochrome)
- High-res Expo assets (icon.png, adaptive-icon.png, adaptive-icon-monochrome.png, splash.png)
- Android mipmap native resources (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) in both standard, round, foreground, and monochrome
"""

import os
import math
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.path import Path
import matplotlib.patches as patches
from matplotlib.collections import LineCollection
from matplotlib.colors import LinearSegmentedColormap
from PIL import Image, ImageDraw

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MOBILE_ASSETS_DIR = os.path.join(PROJECT_ROOT, "apps", "mobile", "assets")
ANDROID_RES_DIR = os.path.join(PROJECT_ROOT, "apps", "mobile", "android", "app", "src", "main", "res")

os.makedirs(MOBILE_ASSETS_DIR, exist_ok=True)

# Colors
COLOR_BG = "#081C15"
COLOR_BG_STROKE = "#0D2E22"
COLOR_WHITE = "#FFFFFF"

# Ring Gradient: Lime Green -> Bright Green -> Teal -> Cyan
ring_colors = [
    (163/255, 230/255, 53/255),   # Lime Green #A3E635
    (34/255, 197/255, 94/255),    # Bright Green #22C55E
    (20/255, 184/255, 166/255),   # Teal #14B8A6
    (6/255, 182/255, 212/255),    # Cyan #06B6D4
]
ring_cmap = LinearSegmentedColormap.from_list("fitness_ring", ring_colors, N=512)

def render_artwork(size_px=1024, mode="full"):
    """
    Renders the artwork to a PIL RGBA Image.
    mode:
      - 'full': with deep forest green rounded square
      - 'foreground': transparent background, scaled to 66% safe zone
      - 'monochrome': pure white on transparent background
      - 'splash': branded splash on solid background
      - 'round': circular clipped full icon
    """
    dpi = 100
    figsize = (size_px / dpi, size_px / dpi)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    fig.patch.set_alpha(0.0)
    ax.patch.set_alpha(0.0)

    ax.set_xlim(0, 1024)
    ax.set_ylim(0, 1024)
    ax.set_aspect("equal")
    ax.axis("off")
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)

    center_x, center_y = 512, 512

    if mode in ["foreground", "monochrome"]:
        scale = 0.70  # Sits comfortably inside 66% safe zone
    elif mode == "splash":
        scale = 0.82
    else:
        scale = 0.94

    # 1. Background
    if mode == "full":
        bg_box = patches.FancyBboxPatch(
            (48, 48), 928, 928,
            boxstyle="round,pad=0,rounding_size=210",
            facecolor=COLOR_BG,
            edgecolor=COLOR_BG_STROKE,
            linewidth=4,
            zorder=1
        )
        ax.add_patch(bg_box)
    elif mode == "splash":
        bg_rect = patches.Rectangle(
            (0, 0), 1024, 1024,
            facecolor=COLOR_BG,
            zorder=1
        )
        ax.add_patch(bg_rect)
    elif mode == "round":
        bg_circle = patches.Circle(
            (512, 512), 480,
            facecolor=COLOR_BG,
            edgecolor=COLOR_BG_STROKE,
            linewidth=4,
            zorder=1
        )
        ax.add_patch(bg_circle)

    # 2. Circular Progress Ring
    ring_radius = 330 * scale
    ring_linewidth = 42 * scale

    # Opening at top-right: 35 degree gap between 30 deg and 65 deg
    theta_start = np.radians(68)
    theta_end = np.radians(30 + 360)
    num_points = 300
    thetas = np.linspace(theta_start, theta_end, num_points)

    rx = center_x + ring_radius * np.cos(thetas)
    ry = center_y + ring_radius * np.sin(thetas)

    points = np.array([rx, ry]).T.reshape(-1, 1, 2)
    segments = np.concatenate([points[:-1], points[1:]], axis=1)

    if mode == "monochrome":
        lc = LineCollection(segments, colors=COLOR_WHITE, linewidths=ring_linewidth, capstyle="round", zorder=3)
        ax.add_collection(lc)
    else:
        t_vals = np.linspace(0, 1, len(segments))
        colors = ring_cmap(t_vals)
        lc = LineCollection(segments, colors=colors, linewidths=ring_linewidth, capstyle="round", zorder=3)
        ax.add_collection(lc)

    # Rounded end caps
    cap_radius = (ring_linewidth / 2)
    start_pt = (rx[0], ry[0])
    end_pt = (rx[-1], ry[-1])
    cap_color_start = COLOR_WHITE if mode == "monochrome" else ring_colors[0]
    cap_color_end = COLOR_WHITE if mode == "monochrome" else ring_colors[-1]
    
    ax.add_patch(patches.Circle(start_pt, cap_radius * 0.96, facecolor=cap_color_start, edgecolor="none", zorder=4))
    ax.add_patch(patches.Circle(end_pt, cap_radius * 0.96, facecolor=cap_color_end, edgecolor="none", zorder=4))

    # 3. Flexed Bicep Minimalist White Outline
    arm_stroke = 24 * scale

    def c(x, y):
        nx = center_x + (x - 512) * scale
        ny = center_y + (y - 505) * scale
        return (nx, ny)

    # Outer perimeter coordinates
    verts = [
        c(370, 485),  # Shoulder base left
        c(365, 545),  # Shoulder curve up
        c(410, 605),  # Deltoid to bicep transition
        c(470, 620),  # BICEP PEAK top
        c(515, 620),  # Bicep descending to inner crease
        c(535, 590),  # Inner elbow notch
        c(555, 615),  # Forearm inner curve
        c(585, 630),  # Forearm upper wrist
        c(620, 635),  # FIST top curve
        c(650, 615),  # Fist knuckle right
        c(655, 570),  # Fist bottom to outer forearm
        c(635, 500),  # Outer forearm descending
        c(640, 435),  # Approaching elbow
        c(625, 390),  # ELBOW TIP bottom right
        c(580, 385),  # Lower elbow curve
        c(525, 405),  # Tricep curve bottom
        c(450, 420),  # Tricep to shoulder lower line
        c(395, 445),  # Joining back to shoulder
        c(370, 485),  # Close path
    ]

    codes = [
        Path.MOVETO,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
    ]

    arm_path = Path(verts, codes)
    arm_patch = patches.PathPatch(
        arm_path,
        facecolor="none",
        edgecolor=COLOR_WHITE,
        linewidth=arm_stroke,
        capstyle="round",
        joinstyle="round",
        zorder=5
    )
    ax.add_patch(arm_patch)

    # Inner anatomical definition line
    inner_verts = [
        c(480, 615),  # Bicep peak
        c(510, 560),  # Down towards elbow crease
        c(540, 520),  # Inner forearm crease
        c(580, 505),  # Forearm muscle line
    ]
    inner_codes = [
        Path.MOVETO,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
    ]
    inner_path = Path(inner_verts, inner_codes)
    inner_patch = patches.PathPatch(
        inner_path,
        facecolor="none",
        edgecolor=COLOR_WHITE,
        linewidth=arm_stroke * 0.75,
        capstyle="round",
        joinstyle="round",
        zorder=6
    )
    ax.add_patch(inner_patch)

    # Render into buffer
    fig.canvas.draw()
    rgba_buffer = np.asarray(fig.canvas.buffer_rgba())
    img = Image.fromarray(rgba_buffer)
    plt.close(fig)
    return img

def export_svg_masters():
    """Exports clean, standard vector SVG master files."""
    def make_svg_text(is_foreground=False, is_monochrome=False, scale=0.94):
        cx, cy = 512, 512
        r = 330 * scale
        stroke_w = 42 * scale
        arm_stroke = 24 * scale

        # Start/end of arc with top-right gap
        # Top-right gap between 30 and 65 deg in polar (where 0 is right, 90 is top)
        # In SVG (where y is down):
        # 0 deg is right, -90 is top, -180 is left, 90 is bottom
        # Opening is between -65 deg and -30 deg
        gap_start = math.radians(-30)
        gap_end = math.radians(-65)
        x_start = cx + r * math.cos(gap_start)
        y_start = cy + r * math.sin(gap_start)
        x_end = cx + r * math.cos(gap_end)
        y_end = cy + r * math.sin(gap_end)

        ring_path = f"M {x_start:.2f} {y_start:.2f} A {r:.2f} {r:.2f} 0 1 1 {x_end:.2f} {y_end:.2f}"

        bg_xml = ""
        if not is_foreground:
            bg_xml = f'<rect x="48" y="48" width="928" height="928" rx="210" fill="{COLOR_BG}" stroke="{COLOR_BG_STROKE}" stroke-width="4"/>'

        if is_monochrome:
            defs_xml = ""
            ring_stroke = f'stroke="{COLOR_WHITE}"'
        else:
            defs_xml = f'''
            <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#A3E635"/>
                    <stop offset="35%" stop-color="#22C55E"/>
                    <stop offset="70%" stop-color="#14B8A6"/>
                    <stop offset="100%" stop-color="#06B6D4"/>
                </linearGradient>
            </defs>
            '''
            ring_stroke = 'stroke="url(#ringGrad)"'

        def c_svg(x, y):
            nx = cx + (x - 512) * scale
            ny = cy - (y - 505) * scale # Flip y for standard cartesian to SVG
            return f"{nx:.1f} {ny:.1f}"

        arm_d = f"""
        M {c_svg(370, 485)}
        C {c_svg(365, 545)} {c_svg(410, 605)} {c_svg(470, 620)}
        C {c_svg(515, 620)} {c_svg(535, 590)} {c_svg(555, 615)}
        C {c_svg(585, 630)} {c_svg(620, 635)} {c_svg(650, 615)}
        C {c_svg(655, 570)} {c_svg(635, 500)} {c_svg(640, 435)}
        C {c_svg(625, 390)} {c_svg(580, 385)} {c_svg(525, 405)}
        C {c_svg(450, 420)} {c_svg(395, 445)} {c_svg(370, 485)}
        Z
        """

        inner_d = f"""
        M {c_svg(480, 615)}
        C {c_svg(510, 560)} {c_svg(540, 520)} {c_svg(580, 505)}
        """

        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
        {defs_xml}
        {bg_xml}
        <path d="{ring_path}" fill="none" {ring_stroke} stroke-width="{stroke_w}" stroke-linecap="round"/>
        <path d="{arm_d}" fill="none" stroke="{COLOR_WHITE}" stroke-width="{arm_stroke}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="{inner_d}" fill="none" stroke="{COLOR_WHITE}" stroke-width="{arm_stroke * 0.75}" stroke-linecap="round"/>
    </svg>'''

    # Write SVGs
    with open(os.path.join(MOBILE_ASSETS_DIR, "fitlife-icon-master.svg"), "w", encoding="utf-8") as f:
        f.write(make_svg_text(is_foreground=False, is_monochrome=False, scale=0.94))
    with open(os.path.join(MOBILE_ASSETS_DIR, "fitlife-icon-foreground.svg"), "w", encoding="utf-8") as f:
        f.write(make_svg_text(is_foreground=True, is_monochrome=False, scale=0.70))
    with open(os.path.join(MOBILE_ASSETS_DIR, "fitlife-icon-monochrome.svg"), "w", encoding="utf-8") as f:
        f.write(make_svg_text(is_foreground=True, is_monochrome=True, scale=0.70))
    print("Master SVGs written to assets directory.")

def main():
    print("=== Generating FITLIFE OS Production Assets ===")

    # 1. Master SVGs
    export_svg_masters()

    # 2. High-Res Expo PNGs (1024x1024)
    print("Rendering 1024x1024 Expo assets...")
    img_full = render_artwork(size_px=1024, mode="full")
    img_full.save(os.path.join(MOBILE_ASSETS_DIR, "icon.png"), "PNG")
    print("Saved icon.png")

    img_fg = render_artwork(size_px=1024, mode="foreground")
    img_fg.save(os.path.join(MOBILE_ASSETS_DIR, "adaptive-icon.png"), "PNG")
    print("Saved adaptive-icon.png")

    img_mono = render_artwork(size_px=1024, mode="monochrome")
    img_mono.save(os.path.join(MOBILE_ASSETS_DIR, "adaptive-icon-monochrome.png"), "PNG")
    print("Saved adaptive-icon-monochrome.png")

    img_splash = render_artwork(size_px=1024, mode="splash")
    img_splash.save(os.path.join(MOBILE_ASSETS_DIR, "splash.png"), "PNG")
    print("Saved splash.png")

    # 3. Android Native Mipmaps
    # Densities:
    # mdpi (1x): ic_launcher: 48, foreground: 108
    # hdpi (1.5x): ic_launcher: 72, foreground: 162
    # xhdpi (2x): ic_launcher: 96, foreground: 216
    # xxhdpi (3x): ic_launcher: 144, foreground: 324
    # xxxhdpi (4x): ic_launcher: 192, foreground: 432
    mipmap_densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    img_round = render_artwork(size_px=1024, mode="round")

    for folder, (launcher_sz, fg_sz) in mipmap_densities.items():
        target_dir = os.path.join(ANDROID_RES_DIR, folder)
        os.makedirs(target_dir, exist_ok=True)

        # Standard squircle launcher icon (.webp)
        icon_resized = img_full.resize((launcher_sz, launcher_sz), Image.Resampling.LANCZOS)
        icon_resized.save(os.path.join(target_dir, "ic_launcher.webp"), "WEBP", quality=100)

        # Round launcher icon (.webp)
        round_resized = img_round.resize((launcher_sz, launcher_sz), Image.Resampling.LANCZOS)
        round_resized.save(os.path.join(target_dir, "ic_launcher_round.webp"), "WEBP", quality=100)

        # Adaptive foreground icon (.webp)
        fg_resized = img_fg.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        fg_resized.save(os.path.join(target_dir, "ic_launcher_foreground.webp"), "WEBP", quality=100)

        # Monochrome themed icon (.webp)
        mono_resized = img_mono.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        mono_resized.save(os.path.join(target_dir, "ic_launcher_monochrome.webp"), "WEBP", quality=100)

        print(f"Generated {folder}: ic_launcher ({launcher_sz}px), foreground ({fg_sz}px)")

    # 4. Splash Screen Native Logos (drawable-*)
    splash_densities = {
        "drawable-mdpi": 288,
        "drawable-hdpi": 432,
        "drawable-xhdpi": 576,
        "drawable-xxhdpi": 864,
        "drawable-xxxhdpi": 1152,
    }
    # Splash logo is foreground (transparent background) at high res
    for folder, sz in splash_densities.items():
        target_dir = os.path.join(ANDROID_RES_DIR, folder)
        os.makedirs(target_dir, exist_ok=True)
        splash_logo = img_fg.resize((sz, sz), Image.Resampling.LANCZOS)
        splash_logo.save(os.path.join(target_dir, "splashscreen_logo.png"), "PNG")
        print(f"Generated {folder}: splashscreen_logo.png ({sz}x{sz})")

    print("All production assets generated successfully!")

if __name__ == "__main__":
    main()
