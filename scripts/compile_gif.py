import os
import glob
from PIL import Image

def create_demo_gif():
    frame_dir = os.path.join(os.path.dirname(__file__), '..', 'docs', 'images', 'frames')
    output_gif = os.path.join(os.path.dirname(__file__), '..', 'docs', 'images', 'prefixguard_demo.gif')

    frame_files = sorted(glob.glob(os.path.join(frame_dir, 'frame_*.png')))
    if not frame_files:
        print("No frames found in", frame_dir)
        return

    frames = []
    # Target resolution for sharp and bandwidth-efficient demo GIF: 1000px wide
    target_width = 1000

    for f in frame_files:
        img = Image.open(f)
        aspect = img.height / img.width
        target_height = int(target_width * aspect)
        resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        # Convert to adaptive 256-color palette for crisp dark tech rendering
        quantized = resized.convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
        frames.append(quantized)

    # Durations: pause longer on the playground diff and cockpit
    durations = [500] * len(frames)
    durations[0] = 1200 # pause on cockpit overview
    durations[3] = 1000 # pause on chargeback
    durations[-1] = 1800 # pause on diff report

    frames[0].save(
        output_gif,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True
    )

    size_kb = os.path.getsize(output_gif) / 1024
    print(f"[✓] Compiled animated demo GIF: {output_gif} ({len(frames)} frames, {size_kb:.1f} KB)")

if __name__ == '__main__':
    create_demo_gif()
