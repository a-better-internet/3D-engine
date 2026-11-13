"use strict";
/* ENGINE · 15-bake.js
   plant the woods, merge every bucket, build the collider grid
   Loaded as a classic script, in order, sharing one global scope with
   its siblings — see index.html. This file runs AFTER the world's files:
   by now everything static has been pushed. */
/* ----------------------------------------------------------------------
   15 · BAKE
   Nothing may be pushed into a bucket after this (it would never be drawn),
   and nothing solid may be added to COL (the grid is built here; COL_DYN is
   for what moves). Things that lie on the ground everywhere (leaves,
   litter) are placed by the world's last file, after everything that
   stands, so they can keep clear of colliders, floors and indoor zones.
   ---------------------------------------------------------------------- */
// the woods are planted; now they become meshes, and their trunks colliders
FOREST.finish();
const BAKED=bakeBuckets(scene);
buildColGrid();                     // everything solid is in place by now
