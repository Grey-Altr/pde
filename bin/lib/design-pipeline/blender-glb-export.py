"""
blender-glb-export.py — Blender Python script for GLB export via bpy.ops.

Usage:
  blender --background input.blend --python blender-glb-export.py -- output.glb

The '--' separator is required. Anything after '--' is passed as script args.
The first positional arg after '--' is the output .glb path.

Exit code:
  0 — success (GLB written)
  1 — failure (missing arg, export error) — use --python-exit-code 1 in caller
"""

import bpy
import sys
import os


def main():
    # Find the '--' separator in sys.argv
    argv = sys.argv
    try:
        separator_idx = argv.index('--')
    except ValueError:
        print('ERROR: Missing -- separator. Usage: blender ... --python blender-glb-export.py -- output.glb')
        sys.exit(1)

    script_args = argv[separator_idx + 1:]
    if not script_args:
        print('ERROR: No output path provided after -- separator.')
        sys.exit(1)

    output_path = script_args[0]

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    print(f'GLB_EXPORT_START: exporting to {output_path}')

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=False,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
    )

    print(f'GLB_EXPORT_DONE: {output_path}')


main()
