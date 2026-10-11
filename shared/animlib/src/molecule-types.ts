import type { ElementStyle, Material, Vec3 } from './types.js';

/** Display beads around supplied coordinates. Radii do not imply atomic accuracy. */
export interface MoleculeProps extends Omit<ElementStyle, 'billboard' | 'billboardOffset'> {
  /** Packed XYZ coordinates, at most 10,000 sites per call. */
  positions: number[];
  /** Display radius in the same units as positions. Required and positive. */
  radius: number;
  /** 0: octahedra (8 faces/site); 1: subdivided octahedra (32 faces/site). Default 0. */
  detail?: 0 | 1;
  /** Subtracted from every coordinate before the group transform. Default [0,0,0]. */
  origin?: Vec3;
  material?: Material;
}

export interface MolecularChain {
  /** Deposited legacy PDB chain ID; may be the empty string. */
  id: string;
  kind: 'protein' | 'nucleic' | 'other';
  positions: number[];
  /** One label per site: residue name, author sequence + insertion code, atom name. */
  sites: string[];
}

export interface MolecularData {
  format: 'animlib-molecule-v1';
  units: 'angstrom';
  selection: 'residues' | 'heavy-atoms';
  chains: MolecularChain[];
  /** Bounding-box midpoint of all selected sites in deposited coordinates. */
  center: Vec3;
  provenance: { source: string; pdbId?: string; title: string; model: string; alternateLocations: string };
}

export interface PDBImportOptions {
  /** URL, repository path or other provenance for the coordinate file. */
  source: string;
  selection?: 'residues' | 'heavy-atoms';
  chains?: string[];
}
