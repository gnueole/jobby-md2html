import os
from PIL import Image, ImageDraw

def generate_favicon():
    # Setup image dimensions
    size = 512
    scale = size / 24.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors
    color_handle = (69, 26, 3, 255)       # #451a03
    color_body = (120, 53, 15, 255)       # #78350f
    color_flap = (69, 26, 3, 255)         # #451a03
    color_straps = (180, 83, 9, 255)      # #b45309
    color_lock = (250, 204, 21, 255)      # #facc15

    # 1. Draw Handle (behind the main body so bottom part is naturally masked)
    handle_xy = [9 * scale, 3 * scale, 15 * scale, 9 * scale]
    draw.rounded_rectangle(handle_xy, radius=2 * scale, outline=color_handle, width=int(2 * scale))

    # 2. Draw Bag Body
    body_xy = [3 * scale, 7 * scale, 21 * scale, 20 * scale]
    draw.rounded_rectangle(body_xy, radius=2 * scale, fill=color_body)

    # 3. Draw Straps
    left_strap_xy = [7 * scale, 7 * scale, 9 * scale, 20 * scale]
    right_strap_xy = [15 * scale, 7 * scale, 17 * scale, 20 * scale]
    draw.rectangle(left_strap_xy, fill=color_straps)
    draw.rectangle(right_strap_xy, fill=color_straps)

    # 4. Draw Flap
    flap_xy = [5 * scale, 10 * scale, 19 * scale, 17 * scale]
    draw.rounded_rectangle(flap_xy, radius=1 * scale, fill=color_flap)

    # 5. Draw Lock
    lock_xy = [11 * scale, 12 * scale, 13 * scale, 14 * scale]
    draw.rounded_rectangle(lock_xy, radius=0.5 * scale, fill=color_lock)

    # Ensure output directories exist
    public_dir = "public"
    os.makedirs(public_dir, exist_ok=True)

    # 6. Save PNGs
    img.resize((48, 48), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "favicon-48x48.png"))
    img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "favicon-192x192.png"))
    img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "favicon-512x512.png"))
    print("PNG favicons generated.")

    # 7. Save multi-resolution ICO
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    img.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=ico_sizes)
    print("favicon.ico generated.")

if __name__ == "__main__":
    generate_favicon()
