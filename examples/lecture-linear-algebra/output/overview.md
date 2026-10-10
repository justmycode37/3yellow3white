# Linear Algebra, Lecture 3: Linear maps, matrices and determinants

Audience: Beginning linear algebra students working in the plane R^2. The lecture is concise and gives definitions with short examples, building the picture of matrices as linear maps from the ground up.

1. **Basis vectors, coordinates and span**: Every vector in the plane is a unique combination x e1 + y e2 of the standard basis vectors, and its coordinates are just the scaling amounts. Combining two non-parallel vectors in this way reaches the whole plane. (`01_t01_basis_and_span/`)
2. **Linear maps and their matrices**: A linear map is fully determined by where it sends e1 and e2. A matrix just records those two images as its columns, so A v means 'x times the first column plus y times the second'. (`02_t02_linear_maps_as_matrices/`)
3. **Matrix multiplication is composition**: Multiplying matrices means doing one linear map after another. BA means 'first A, then B', and each column of BA is B applied to the matching column of A. Because order matters for motions, AB ≠ BA in general. (`03_t03_matrix_multiplication_composition/`)
4. **The determinant as area scaling**: The determinant is the single factor by which a linear map scales every area, with a sign that records whether orientation flips. When it is zero, the plane collapses and the map cannot be undone. Determinants multiply under composition. (`04_t04_determinant/`)
