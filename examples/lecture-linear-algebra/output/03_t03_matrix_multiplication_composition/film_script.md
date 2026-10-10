# Script: Matrix multiplication is composition

## Rotate, then shear  (00:00.00 - 00:45.00)

- **00:00.60** Here's our familiar grid, with e1 and e2.
- **00:03.80** Let's apply a matrix R, which turns the whole plane a quarter turn.
- **00:11.00** Then a second matrix, S, shears that already rotated plane sideways.
- **00:17.00** That's two motions. Now let's rewind.
- **00:26.50** What if we go straight there, in one motion?
- **00:31.20** The lines stay straight and evenly spaced, the origin fixed.
- **00:36.50** So it's a single linear map, with one matrix.
- **00:41.40** We just don't know its columns yet.

## Follow e1 and e2  (00:45.00 - 01:35.00)

- **00:46.00** To find those columns, just watch e1 and e2.
- **00:53.20** The rotation swings e1 straight up.
- **00:56.70** Then the shear slides it over to the diagonal.
- **01:01.50** Now e2. The rotation swings it to point left.
- **01:06.20** And the shear? Nothing at all.
- **01:09.40** It lies along the axis the shear leaves alone.
- **01:14.50** Those two landing spots become the columns of S R.
- **01:20.30** And we never used a multiplication rule.
- **01:25.30** And the whole plane simply follows those two arrows.
