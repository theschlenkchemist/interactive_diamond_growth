"""
Parametric model and sprite renderer for the MWCVD reactor trainer.

Run headless, no GUI needed:

    blender --background --python tools/blender/reactor.py

Optional arguments after a double dash:

    blender -b -P tools/blender/reactor.py -- --samples 256 --width 1400

Output goes to public/sprites/ as PNGs with a transparent background, so the
web app can composite the plasma glow on top of them.

All dimensions are in millimetres and are PROVISIONAL. They match the constants
in src/sim/physics.ts. If Bristol give you real measurements, change them here
and in CAVITY at the same time.
"""

import argparse
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

# ---------------------------------------------------------------------------
# Geometry, millimetres. Keep in step with CAVITY in src/sim/physics.ts
# ---------------------------------------------------------------------------
CAVITY_R = 62.0          # internal radius of the aluminium cavity
CAVITY_H = 130.0         # internal height
WALL = 18.0              # wall thickness
SUBSTRATE_TO_WINDOW = 62.0
STAGE_R = 42.0
STAGE_H = 14.0
FLANGE_R = 118.0
FLANGE_H = 22.0
WAVEGUIDE = (210.0, 86.0, 44.0)
VIEWPORT_R = 19.0
JACK_TRAVEL = 46.0

SPRITES = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'sprites')


# ---------------------------------------------------------------------------
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, base, metallic=0.0, roughness=0.5, transmission=0.0, emission=None, emission_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1.0)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = roughness
    # Transmission input name changed between Blender versions
    for key in ('Transmission Weight', 'Transmission'):
        if key in b.inputs:
            b.inputs[key].default_value = transmission
            break
    if emission is not None:
        for key in ('Emission Color', 'Emission'):
            if key in b.inputs:
                b.inputs[key].default_value = (*emission, 1.0)
                break
        if 'Emission Strength' in b.inputs:
            b.inputs['Emission Strength'].default_value = emission_strength
    if transmission > 0:
        m.blend_method = 'BLEND'
    return m


def cylinder(name, r, h, z, verts=96, material=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(0, 0, z))
    o = bpy.context.object
    o.name = name
    if material:
        o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    o.data.use_auto_smooth = True if hasattr(o.data, 'use_auto_smooth') else False
    return o


def cube(name, size, loc, material=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = Vector(size) / 2
    bpy.ops.object.transform_apply(scale=True)
    if material:
        o.data.materials.append(material)
    return o


def boolean(target, cutter, op='DIFFERENCE'):
    m = target.modifiers.new('bool', 'BOOLEAN')
    m.object = cutter
    m.operation = op
    m.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def bevel(obj, width=1.2, segments=3):
    m = obj.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segments
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(40)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=m.name)


# ---------------------------------------------------------------------------
def build(jack_down=False, cutaway=True):
    clear_scene()

    alu = mat('Aluminium', (0.72, 0.74, 0.77), metallic=1.0, roughness=0.34)
    alu_dark = mat('AluminiumDark', (0.45, 0.47, 0.50), metallic=1.0, roughness=0.48)
    brass = mat('Brass', (0.72, 0.58, 0.24), metallic=1.0, roughness=0.28)
    steel = mat('Steel', (0.55, 0.57, 0.60), metallic=1.0, roughness=0.22)
    quartz = mat('Quartz', (0.92, 0.96, 0.98), roughness=0.03, transmission=0.95)
    black = mat('Anodised', (0.06, 0.06, 0.07), metallic=0.2, roughness=0.55)

    drop = JACK_TRAVEL if jack_down else 0.0

    # cavity body, hollowed
    body = cylinder('CavityBody', CAVITY_R + WALL, CAVITY_H, CAVITY_H / 2, material=alu)
    bore = cylinder('bore', CAVITY_R, CAVITY_H + 40, CAVITY_H / 2)
    boolean(body, bore)

    # viewport bore through the wall
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=VIEWPORT_R, depth=WALL * 4,
                                        rotation=(0, math.radians(90), 0),
                                        location=(CAVITY_R, 0, CAVITY_H * 0.32))
    boolean(body, bpy.context.object)

    # viewport flange and glass
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=VIEWPORT_R + 11, depth=7,
                                        rotation=(0, math.radians(90), 0),
                                        location=(CAVITY_R + WALL + 2, 0, CAVITY_H * 0.32))
    vp = bpy.context.object
    vp.name = 'ViewportFlange'
    vp.data.materials.append(steel)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=VIEWPORT_R, depth=4,
                                        rotation=(0, math.radians(90), 0),
                                        location=(CAVITY_R + WALL, 0, CAVITY_H * 0.32))
    vg = bpy.context.object
    vg.name = 'ViewportGlass'
    vg.data.materials.append(quartz)

    # quartz window separating waveguide from chamber
    win = cylinder('QuartzWindow', CAVITY_R - 4, 5, SUBSTRATE_TO_WINDOW + FLANGE_H, material=quartz)

    # waveguide and coupling section
    wg = cube('Waveguide', WAVEGUIDE, (30, 0, CAVITY_H + 48), alu)
    bevel(wg, 2.0)
    coupler = cube('Coupler', (96, 96, 34), (0, 0, CAVITY_H + 14), alu)

    # stub tuners
    for i, x in enumerate((-40, 10, 60)):
        t = cylinder(f'Stub{i}', 9, 30, CAVITY_H + 48 + WAVEGUIDE[2] / 2 + 12, verts=32, material=brass)
        t.location.x = x
        knob = cylinder(f'StubKnob{i}', 15, 8, CAVITY_H + 48 + WAVEGUIDE[2] / 2 + 28, verts=32, material=black)
        knob.location.x = x

    # pyrometer, looking down the axis at an angle
    pyro = cylinder('Pyrometer', 17, 92, 0, verts=48, material=black)
    pyro.rotation_euler = (math.radians(28), 0, 0)
    pyro.location = (-96, 74, CAVITY_H + 118)

    # base flange, stage, substrate. These drop with the jack.
    flange = cylinder('BaseFlange', FLANGE_R, FLANGE_H, FLANGE_H / 2 - drop, material=alu)
    bevel(flange, 1.5)
    stage_lower = cylinder('StageLower', STAGE_R + 16, 9, FLANGE_H + 4 - drop, material=alu_dark)
    stage = cylinder('Stage', STAGE_R, STAGE_H, FLANGE_H + STAGE_H / 2 + 6 - drop, material=brass)
    sub = cylinder('Substrate', 20, 1.2, FLANGE_H + STAGE_H + 7 - drop, verts=64, material=black)

    # water lines
    for sgn in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=6, depth=150,
                                            rotation=(0, math.radians(78), 0),
                                            location=(sgn * 130, 40, FLANGE_H / 2 - drop - 16))
        p = bpy.context.object
        p.name = f'WaterLine{sgn}'
        p.data.materials.append(mat(f'Hose{sgn}', (0.78, 0.66, 0.18), roughness=0.62))

    # simplified scissor jack
    for sgn in (-1, 1):
        arm = cube('JackArm', (150, 12, 6), (0, sgn * 34, -34 - drop / 2), steel)
        arm.rotation_euler = (0, math.radians(sgn * (18 + drop * 0.22)), 0)
    cube('JackBase', (170, 110, 10), (0, 0, -70), alu_dark)
    knob = cylinder('JackKnob', 22, 14, -36 - drop / 2, verts=32, material=black)
    knob.rotation_euler = (math.radians(90), 0, 0)
    knob.location = (96, -58, -36 - drop / 2)

    # quarter cutaway so the interior, stage and window are visible
    if cutaway:
        cutter = cube('Cutter', (400, 400, 500), (200, -200, CAVITY_H / 2))
        for name in ('CavityBody', 'Waveguide', 'Coupler', 'QuartzWindow'):
            o = bpy.data.objects.get(name)
            if o is None:
                continue
            c = cutter.copy()
            c.data = cutter.data.copy()
            bpy.context.collection.objects.link(c)
            boolean(o, c)
        bpy.data.objects.remove(cutter, do_unlink=True)

    return body


def lighting_and_camera(width, height):
    scene = bpy.context.scene

    world = bpy.data.worlds.new('World')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.06, 0.08, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    scene.world = world

    def area(name, loc, rot, size, energy, colour=(1, 1, 1)):
        bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
        l = bpy.context.object
        l.name = name
        l.data.size = size
        l.data.energy = energy
        l.data.color = colour
        return l

    area('Key', (420, -520, 480), (math.radians(52), 0, math.radians(38)), 600, 900000)
    area('Fill', (-520, -320, 220), (math.radians(74), 0, math.radians(-52)), 700, 260000, (0.82, 0.88, 1.0))
    area('Rim', (-180, 520, 420), (math.radians(-118), 0, math.radians(200)), 500, 420000, (0.9, 0.95, 1.0))

    bpy.ops.object.camera_add(location=(560, -760, 330), rotation=(math.radians(76), 0, math.radians(36)))
    cam = bpy.context.object
    cam.data.lens = 78
    cam.data.sensor_width = 36
    scene.camera = cam

    # aim at the middle of the cavity
    target = bpy.data.objects.new('Target', None)
    bpy.context.collection.objects.link(target)
    target.location = (0, 0, 95)
    c = cam.constraints.new('TRACK_TO')
    c.target = target
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Filmic' if 'Filmic' in [v.name for v in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items] else 'Standard'


def render(path, samples):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.device = 'CPU'
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('wrote', path)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--samples', type=int, default=128)
    ap.add_argument('--width', type=int, default=1200)
    ap.add_argument('--height', type=int, default=1500)
    ap.add_argument('--no-cutaway', action='store_true')
    args = ap.parse_args(argv)

    out = os.path.abspath(SPRITES)

    for name, jack_down in (('reactor_closed', False), ('reactor_open', True)):
        build(jack_down=jack_down, cutaway=not args.no_cutaway)
        lighting_and_camera(args.width, args.height)
        render(os.path.join(out, name + '.png'), args.samples)

    print('\nSprites written to', out)
    print('The web app picks them up automatically on the Rendered tab.')


if __name__ == '__main__':
    main()
