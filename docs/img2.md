# Image Generation Prompt for Figure 2: Confusion Matrix

**Filename in LaTeX:** `img2.png`
**Target Section:** Category Classification Performance

### Image Description & Purpose
This image will be a Confusion Matrix visualizing the classification accuracy across the 13 different civic grievance categories. It proves to the reader that despite the severe class imbalance (e.g., thousands of road complaints vs. only dozens of water supply complaints), the Logistic Regression model with class-weighting performs consistently well across all classes, showing a strong diagonal line.

### Suggested AI Image Generator Prompt
> Create a high-resolution, academic-style Confusion Matrix plot for a machine learning classification model. 
> 
> - The matrix should be a square grid (representing 13x13 classes). 
> - The X-axis should be labeled "Predicted Label" and the Y-axis should be labeled "True Label".
> - Use a sequential blue color map (light blue to dark navy). The diagonal squares going from the top-left to the bottom-right should be the darkest blue, indicating high accuracy. 
> - All off-diagonal squares should be mostly white or very pale blue, indicating low misclassification rates.
> - Add some dummy text labels along the X and Y axes representing civic categories like "Roads", "Water", "Garbage", "Electricity", "Health". The text along the X-axis should be rotated 90 degrees vertically to fit.
> - Include a color scale bar on the right side of the matrix.
> - The overall aesthetic should be a clean, scientific, matplotlib/seaborn style visualization suitable for a white-background IEEE research paper. Do not make it look like 3D art or an abstract painting; it must look like a generated data plot.
