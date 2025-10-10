"""
Create application icon for jhl-github-desktop
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon():
    # Create icon sizes
    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
    
    for size in sizes:
        # Create image with transparent background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Background circle (GitHub style)
        padding = size // 10
        bg_color = (36, 41, 47, 255)  # GitHub dark color
        draw.ellipse([padding, padding, size-padding, size-padding], fill=bg_color)
        
        # Gear icon (Actions symbol)
        center = size // 2
        gear_radius = size // 3
        gear_color = (42, 161, 152, 255)  # GitHub Actions green
        
        # Draw simplified gear
        for i in range(6):
            angle = i * 60
            import math
            x1 = center + gear_radius * math.cos(math.radians(angle))
            y1 = center + gear_radius * math.sin(math.radians(angle))
            tooth_size = size // 12
            draw.rectangle([x1-tooth_size//2, y1-tooth_size//2, 
                          x1+tooth_size//2, y1+tooth_size//2], 
                          fill=gear_color)
        
        # Center circle
        inner_radius = size // 6
        draw.ellipse([center-inner_radius, center-inner_radius, 
                     center+inner_radius, center+inner_radius], 
                     fill=bg_color)
        
        # Play button in center (Actions run symbol)
        play_color = (255, 255, 255, 255)
        play_size = size // 10
        draw.polygon([
            (center - play_size//2, center - play_size),
            (center - play_size//2, center + play_size),
            (center + play_size, center)
        ], fill=play_color)
        
        # Save PNG
        img.save(f'icon_{size}x{size}.png')
        print(f'Created icon_{size}x{size}.png')
    
    # Create .ico file for Windows (combining multiple sizes)
    icon_images = [Image.open(f'icon_{size}x{size}.png') for size in [16, 32, 48, 64, 128, 256]]
    icon_images[0].save('icon.ico', format='ICO', sizes=[(s, s) for s in [16, 32, 48, 64, 128, 256]])
    print('Created icon.ico')
    
    # Create .icns for macOS (requires pillow-icns or manual creation)
    print('For macOS .icns, use: iconutil -c icns icon.iconset')
    
    # Clean up individual PNGs
    for size in sizes:
        if os.path.exists(f'icon_{size}x{size}.png'):
            if size not in [512, 1024]:  # Keep large ones for iconset
                os.remove(f'icon_{size}x{size}.png')

if __name__ == '__main__':
    create_icon()
