import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, weld } from '@gltf-transform/functions';
import fs from 'node:fs/promises';
const io=new NodeIO();const doc=await io.read('public/assets/glasshouse-kit.raw.glb');
await doc.transform(dedup(),weld(),prune({keepLeaves:true}));
await io.write('public/assets/glasshouse-kit.glb',doc);
const size=(await fs.stat('public/assets/glasshouse-kit.glb')).size;
console.log(`Optimized GLB: ${(size/1024).toFixed(0)} KiB; ${doc.getRoot().listMeshes().length} meshes, ${doc.getRoot().listMaterials().length} materials.`);
// Intermediate export is reproducible and not a runtime asset.
await fs.rename('public/assets/glasshouse-kit.raw.glb','assets/source/glasshouse-kit.raw.glb');
