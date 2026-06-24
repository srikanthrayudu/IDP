# Image Generation Prompt for Figure 3: SHAP Explainer Plot

**Filename in LaTeX:** `img3.png`
**Target Section:** System Integration and SHAP Analysis

### Image Description & Purpose
This image will visually demonstrate the "Explainable AI" aspect of the paper. It should show a SHAP summary plot or force plot that highlights which specific words (features) pushed the machine learning model to classify a complaint into a specific category. This proves that the AI is making decisions based on rational human language rather than random noise.

### Suggested AI Image Generator Prompt
> Create a clean, scientific data visualization representing a "SHAP feature importance" horizontal bar chart for a text classification model. 
> 
> - The chart should have a white background and be styled like a standard matplotlib or seaborn plot suitable for an academic paper.
> - The Y-axis on the left should list short text phrases (n-grams) such as "massive pothole", "traffic jams", "accidents", "street light", "water leak". 
> - The X-axis at the bottom should be labeled "SHAP Value (Impact on Model Output)".
> - Draw horizontal bars extending from a central zero-line on the X-axis. 
> - The bars for "massive pothole" and "accidents" should be the longest, extending to the right (positive impact), and colored in a distinct magenta or bright red.
> - The bars for words like "street light" should be very short or extend slightly to the left (negative impact), and colored in blue.
> - Do not include any abstract AI art, glowing brains, or futuristic elements. The image must look strictly like a generated statistical graph.
