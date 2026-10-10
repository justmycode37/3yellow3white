# Linear Algebra, Lecture 3: Linear maps, matrices and determinants

## 3.1 Basis vectors and linear combinations

Every vector v in R^2 can be written uniquely as v = x e1 + y e2, where
e1 = (1, 0) and e2 = (0, 1) are the standard basis vectors (also written i-hat and
j-hat). The numbers x and y are the coordinates of v. A sum of scaled vectors
a u + b w is called a linear combination of u and w. The set of all linear
combinations of u and w is their span; if u and w are not parallel, the span is the
whole plane.

Example: (3, 2) = 3 e1 + 2 e2.

## 3.2 Linear maps

A map T: R^2 -> R^2 is linear if T(u + w) = T(u) + T(w) and T(c u) = c T(u) for all
vectors u, w and scalars c. Geometrically, a linear map keeps grid lines parallel and
evenly spaced and keeps the origin fixed.

Because v = x e1 + y e2, linearity gives T(v) = x T(e1) + y T(e2). So T is completely
determined by the two vectors T(e1) and T(e2). Writing them as the columns of a 2x2
matrix A = [T(e1) T(e2)] we get

    A v = x (first column of A) + y (second column of A).

Example: rotation by 90 degrees sends e1 to (0, 1) and e2 to (-1, 0), so its matrix is
R = [[0, -1], [1, 0]]. Then R (3, 2) = 3 (0, 1) + 2 (-1, 0) = (-2, 3).

## 3.3 Matrix multiplication is composition

If we first apply A and then B, the result v -> B(A v) is again linear. Its matrix is
the product BA, defined so that (BA) v = B (A v) for every v. Reading off columns:
the first column of BA is B times the first column of A, and the second column of BA
is B times the second column of A. Note the order: BA means "first A, then B".

Example: with the rotation R above and the shear S = [[1, 1], [0, 1]],
SR = [[1, -1], [1, 0]] while RS = [[0, -1], [1, 1]]. In general AB != BA: matrix
multiplication is not commutative, because doing two motions in a different order
gives a different result.

## 3.4 The determinant

A linear map scales all areas by the same factor. The unit square spanned by e1 and
e2 is mapped to the parallelogram spanned by the columns of A; its signed area is the
determinant det A = ad - bc for A = [[a, b], [c, d]]. If det A is negative the map
flips orientation; if det A = 0 the plane is squashed onto a line or a point and the
map cannot be undone.

Since areas are scaled first by det A and then by det B, we get det(BA) = det B det A.

Examples: det R = 1 (rotations keep areas), det S = 1 (shears keep areas),
det [[2, 0], [0, 3]] = 6.

## Exercises

1. Compute RS and SR for the matrices above and check that they differ.
2. Find a 2x2 matrix with determinant 0 and describe what it does to the plane.
