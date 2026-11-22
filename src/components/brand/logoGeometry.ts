// Shared geometry for the Xperience mark (2D SVG and 3D extrusion use the same paths).
// Mark coordinate space: 0..400 x 0..400, centre (200,200).

export const MARK = { size: 400, cx: 200, cy: 200, ringR: 150, ringW: 7, bladeAngle: 42 } as const;

/** A single chrome blade drawn vertically through the centre, tip up. Rotated ±bladeAngle to form the X. */
export const BLADE_PATH =
  "M200 18 L214 70 L219 150 L216 262 L209 330 L200 382 L191 330 L184 262 L181 150 L186 70 Z";

/** Bevel highlight running down the blade's spine. */
export const BLADE_SPINE = "M200 30 L203 150 L201 300 L200 370 L199 300 L197 150 Z";

export const bladeTransform = (side: "left" | "right") =>
  `rotate(${side === "left" ? -MARK.bladeAngle : MARK.bladeAngle} ${MARK.cx} ${MARK.cy})`;
