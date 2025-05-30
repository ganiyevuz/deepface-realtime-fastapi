from PIL import Image, ImageDraw
import os

def create_icon():
    # Create a 1024x1024 image with a transparent background
    size = 1024
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Draw a circle with a gradient-like effect
    center = size // 2
    radius = size // 2 - 50
    
    # Draw the main circle
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill='#2ed573'  # Green color
    )
    
    # Draw a face silhouette
    face_radius = radius * 0.6
    draw.ellipse(
        [center - face_radius, center - face_radius * 1.2, 
         center + face_radius, center + face_radius * 0.8],
        fill='#ffffff'  # White color
    )
    
    # Draw eyes
    eye_radius = face_radius * 0.15
    eye_y = center - face_radius * 0.3
    draw.ellipse(
        [center - face_radius * 0.4 - eye_radius, eye_y - eye_radius,
         center - face_radius * 0.4 + eye_radius, eye_y + eye_radius],
        fill='#2ed573'
    )
    draw.ellipse(
        [center + face_radius * 0.4 - eye_radius, eye_y - eye_radius,
         center + face_radius * 0.4 + eye_radius, eye_y + eye_radius],
        fill='#2ed573'
    )
    
    # Draw a smile
    smile_radius = face_radius * 0.4
    draw.arc(
        [center - smile_radius, center - smile_radius * 0.5,
         center + smile_radius, center + smile_radius * 0.5],
        0, 180, fill='#2ed573', width=int(face_radius * 0.1)
    )
    
    # Save as PNG
    os.makedirs('static', exist_ok=True)
    image.save('static/icon.png')
    
    # Save as ICO for Windows
    image.save('static/icon.ico', format='ICO', sizes=[(256, 256)])
    
    print("Icons created successfully!")

if __name__ == '__main__':
    create_icon() 