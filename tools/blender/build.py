"""Reproducible, original Blender kit. Run with Python or Blender --background --python.
Metres, Z-up authoring / Y-up glTF; roots at ground level. No external assets.
"""
import sys, os, math, random, pathlib, subprocess, shutil
ROOT=pathlib.Path(__file__).resolve().parents[2]
try:
    import bpy
except ImportError:
    blender=shutil.which('blender')
    if not blender:
        candidates=list(pathlib.Path('C:/Program Files/Blender Foundation').glob('*/blender.exe'))
        blender=str(sorted(candidates)[-1]) if candidates else None
    if not blender: raise SystemExit('Blender not found. Add Blender to PATH.')
    raise SystemExit(subprocess.call([blender,'--background','--python',str(pathlib.Path(__file__).resolve())]))
from mathutils import Vector
random.seed(31)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):bpy.data.materials.remove(m)
COLORS={'ivory':'E5D5B2','sage':'52755C','rust':'A75237','walnut':'553625','brass':'B68B4A','skin':'C89470','hair':'342D26','copper':'81482D','ink':'273A32','petal':'DD8D6C','leaf':'759251','paper':'C4B489','ceramic':'668F86','soil':'352F22','white':'F0DDAF'}
materials={}
for name,h in COLORS.items():
    def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    m=bpy.data.materials.new(name);m.diffuse_color=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=m.diffuse_color;b.inputs['Roughness'].default_value=.78;b.inputs['Metallic'].default_value=.55 if name=='brass' else 0
    materials[name]=m
def empty(name,parent=None,loc=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o
def finish(o,name,material,parent):
    o.name=name;o.data.materials.append(materials[material]);o.parent=parent;return o
def cube(name,loc,scale,material,parent,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft handmade edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,name,material,parent)
def uv(name,loc,scale,material,parent,segments=12,rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc);o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,material,parent)
def cone(name,loc,r1,r2,depth,material,parent,vertices=12):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r1,radius2=r2,depth=depth,location=loc);return finish(bpy.context.object,name,material,parent)
def torus(name,loc,radius,thickness,material,parent,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=thickness,major_segments=48,minor_segments=6,location=loc,rotation=rotation);return finish(bpy.context.object,name,material,parent)
def tube(name,points,r,material,parent):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=6;c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for b,p in zip(s.bezier_points,points):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(materials[material]);o.parent=parent;return o
def petal(name,loc,length,width,material,parent,angle=0,lift=.2):
    verts=[];faces=[]
    for i in range(9):
        t=i/8;w=math.sin(math.pi*t)**.7*width
        for j in range(5):
            q=(j-2)/2;verts.append((q*w,t*length,math.sin(t*math.pi)*lift+abs(q)*.13))
    for i in range(8):
        for j in range(4):a=i*5+j;faces.append((a,a+1,a+6,a+5))
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler.z=angle;o.parent=parent;o.data.materials.append(materials[material]);mod=o.modifiers.new('Leaf thickness','SOLIDIFY');mod.thickness=.025
    for p in me.polygons:p.use_smooth=True
    return o

def character(name,nell=False):
    root=empty(name);height=.94 if nell else 1
    torso=cone(name+'_Jacket',(0,0,1.12),.31,.26,.65,'sage' if nell else 'ivory',root)
    torso.scale.y=.78
    # Overlapping collar, seams, belt and distinct work clothes.
    cone(name+'_Collar',(0,0,1.46),.22,.17,.11,'ivory',root)
    cube(name+'_Apron',(0,.235,1.07),(.39,.055,.58),'ivory' if nell else 'rust',root,.025)
    cube(name+'_Pocket',(0,.274,1.09),(.27,.035,.2),'paper' if nell else 'rust',root,.018)
    cube(name+'_Belt',(0,0,.87),(.62,.49,.075),'walnut',root,.024)
    cube(name+'_Buckle',(.06,.27,.87),(.12,.045,.09),'brass',root,.01)
    if not nell:
        for side in [-1,1]:cube(name+'_ApronTail',(side*.15,.19,.61),(.26,.09,.47),'rust',root,.025)
    cape=empty(name+'_Cape',root,(0,-.08,1.4))
    if nell:
        c=cone(name+'_Capelet',(0,0,-.13),.44,.19,.38,'sage',cape);c.scale.y=.82
        torus(name+'_CapeTrim',(0,0,-.31),.42,.022,'brass',cape).scale.y=.82
    else:
        cube(name+'_JacketBack',(0,-.22,1.1),(.49,.08,.56),'ivory',root,.035)
        torus(name+'_BackEmblem',(0,-.273,1.21),.105,.011,'brass',root,(math.pi/2,0,0))
    uv(name+'_Neck',(0,0,1.5),(.12,.12,.14),'skin',root)
    uv(name+'_Head',(0,.015,1.72),(.235,.205,.27),'skin',root,16,10)
    uv(name+'_Nose',(0,.212,1.69),(.048,.065,.057),'skin',root)
    for side in [-1,1]:
        uv(name+'_Ear',(side*.228,0,1.71),(.058,.055,.09),'skin',root)
        uv(name+'_Eye',(side*.083,.195,1.75),(.026,.016,.031),'ink',root,8,6)
        cube(name+'_Brow',(side*.083,.192,1.805),(.08,.027,.019),'copper' if nell else 'hair',root,.006)
        arm=empty(name+'_Arm'+('L' if side<0 else 'R'),root,(side*.32,0,1.4))
        uv(name+'_Sleeve',(side*.035,0,-.19),(.13,.135,.25),'ivory',arm)
        cone(name+'_Cuff',(side*.05,0,-.37),.105,.11,.08,'paper',arm)
        uv(name+'_Hand',(side*.05,.018,-.46),(.083,.079,.115),'skin',arm)
        leg=empty(name+'_Leg'+('L' if side<0 else 'R'),root,(side*.16,0,.81))
        uv(name+'_Trousers',(0,0,-.31),(.14,.135,.36),'ivory' if nell else 'ink',leg)
        cube(name+'_Boot',(0,.06,-.69),(.235,.36,.17),'walnut',leg,.05)
        cube(name+'_Sole',(0,.06,-.775),(.25,.37,.035),'ink',leg,.014)
        if side>0:
            tool=empty(name+'_Instrument',arm,(.07,.05,-.47));cone(name+'_Stylus',(0,0,-.19),.025,.03,.46,'brass',tool,8)
            torus(name+'_Caliper',(0,0,-.38),.075,.018,'brass',tool,(math.pi/2,0,0));uv(name+'_InkNib',(0,0,-.45),(.03,.03,.06),'ink',tool)
    if nell:
        for i in range(22):
            a=i*2.4;r=.2 if i<16 else .12;uv(name+'_Curl',(math.sin(a)*r,math.cos(a)*r*.9-.02,1.87+math.sin(i*1.7)*.055),(.09,.085,.1),'copper',root,8,6)
        uv(name+'_Satchel',(-.37,-.06,.81),(.2,.13,.23),'walnut',root)
        for i in range(3):uv(name+'_Seed',(-.4+i*.06,-.04,1.02),(.035,.034,.08),'brass',root)
    else:
        uv(name+'_Hair',(0,-.025,1.89),(.245,.205,.16),'hair',root)
        for i in range(7):uv(name+'_HairLock',((i-3)*.065,.15,1.88+math.sin(i)*.035),(.07,.09,.08),'hair',root,8,6)
        cube(name+'_ToolRoll',(.36,-.06,.83),(.15,.19,.27),'walnut',root,.025)
    return root
character('Ivo');character('Nell',True)

root=empty('Planter');cone('Pot',(0,0,.42),.42,.63,.84,'rust',root);torus('PotRim',(0,0,.85),.62,.07,'rust',root);cone('Earth',(0,0,.82),.56,.56,.03,'soil',root)
for i in range(8):
    a=i*2.4;h=1.15+(i%3)*.28;x=math.sin(a)*.25;y=math.cos(a)*.25;tube('Stem',[(0,0,.8),(x,y,1.1),(x*1.8,y*1.8,h+.3)],.035,'sage',root);petal('Leaf',(x,y,h),.85,.26,'leaf' if i%2 else 'sage',root,a,.22)
for i in range(3):
    x=math.sin(i*2.1)*.3;y=math.cos(i*2.1)*.3;z=1.75+i*.1;tube('FlowerStem',[(0,0,.8),(x,y,z)],.025,'sage',root)
    for j in range(6):petal('Petal',(x,y,z),.35,.12,'petal',root,j*math.pi/3,.13)
    uv('FlowerHeart',(x,y,z+.07),(.08,.08,.07),'brass',root)

root=empty('Workbench');cube('Tabletop',(0,0,1.45),(4,2.5,.2),'walnut',root,.09)
for x in [-1.65,1.65]:
    for y in [-.9,.9]:cube('Leg',(x,y,.68),(.23,.23,1.36),'walnut',root)
cube('Shelf',(0,0,.35),(3.5,2.1,.15),'walnut',root);cube('Parchment',(.45,.2,1.57),(1.4,.95,.02),'paper',root,.01)
for i in range(3):torus('DraftingArc',(.45,.2,1.59),.18+i*.11,.007,'brass',root)
for i in range(4):cube('Book',(-1.2,0,1.58+i*.13),(.62,.85,.11),['sage','rust','ivory'][i%3],root,.018)
cone('InkPot',(1.4,.6,1.72),.13,.12,.27,'ceramic',root);cone('Ink',(1.4,.6,1.86),.09,.09,.01,'ink',root)
cube('Bench',(0,-1.9,.8),(2.8,.6,.15),'walnut',root)
for x in [-1,1]:cube('BenchLeg',(x,-1.9,.4),(.18,.4,.8),'walnut',root)

root=empty('Bookshelf');cube('Back',(0,-.48,2.2),(3,.14,4.4),'walnut',root)
for x in [-1.48,1.48]:cube('Side',(x,0,2.2),(.15,1.1,4.4),'walnut',root)
for k in range(5):
    z=.15+k*.98;cube('Shelf',(0,0,z),(3.1,1.2,.13),'walnut',root)
    for j in range(8):
        x=-1.2+j*.34;h=random.uniform(.45,.78);cube('Pages',(x,0,z+.08+h/2),(.22,.64,h),'paper',root,.008)
        for side in [-1,1]:cube('Cover',(x+side*.12,0,z+.08+h/2),(.025,.7,h+.035),['sage','rust','ink','ceramic'][j%4],root,.008)
        cube('Spine',(x,.34,z+.08+h/2),(.26,.03,h+.04),['sage','rust','ink','ceramic'][j%4],root,.009)
        for dz in [-.15,.15]:cube('SpineBand',(x,.362,z+.08+h/2+dz),(.2,.01,.018),'brass',root,.001)

root=empty('Lantern');cone('Base',(0,0,.05),.3,.24,.1,'brass',root);cone('Glow',(0,0,.4),.17,.17,.56,'white',root)
for i in range(4):a=i*math.pi/2;cube('Cage',(math.sin(a)*.23,math.cos(a)*.23,.4),(.04,.04,.7),'brass',root,.008)
cone('Roof',(0,0,.83),.35,.04,.26,'brass',root);torus('Handle',(0,0,1.02),.15,.025,'brass',root,(math.pi/2,0,0))

root=empty('Ceramic');cone('Cup',(0,0,.2),.16,.22,.4,'ceramic',root);cone('Tea',(0,0,.41),.18,.18,.012,'walnut',root);torus('Handle',(.24,0,.23),.12,.035,'brass',root,(math.pi/2,0,0));torus('Lip',(0,0,.4),.21,.024,'ivory',root)
root=empty('Bell');cone('Bellbody',(0,0,.35),.45,.17,.65,'brass',root);torus('Bellrim',(0,0,.05),.44,.045,'brass',root);uv('Clapper',(0,0,.07),(.095,.095,.13),'walnut',root)

root=empty('GreenhouseArch')
for x in [-14,14]:
    cube('Foot',(x,0,.4),(.85,.9,.8),'ink',root,.09);cube('Column',(x,0,3),(.25,.25,5),'sage',root)
    for z in [1,3,5.5]:cone('Collar',(x,0,z),.24,.24,.13,'brass',root)
pts=[(math.cos(i/40*math.pi)*14,0,3+math.sin(i/40*math.pi)*10) for i in range(41)]
tube('Arch',pts,.12,'sage',root)
tube('InnerArch',[(x*.96,y,z-.42) for x,y,z in pts],.047,'brass',root)
for i in range(1,12):
    a=i*math.pi/12;x=math.cos(a)*14;z=3+math.sin(a)*10;tube('Lattice',[(x,0,z),(x*.95,0,z-.55)],.045,'brass',root)
for x in [-10,-6,-2,2,6,10]:
    height=3+math.sqrt(1-(x/14)**2)*10;tube('Longitudinal',[(x,-4,height),(x,4,height)],.055,'sage',root)
    # subtle etched glass panels are intentionally left out: clear sightlines beat alpha overdraw.

root=empty('SealRing');torus('OuterBand',(0,0,.08),3,.105,'brass',root);torus('InnerBand',(0,0,.08),2.73,.045,'brass',root)
for i in range(12):
    a=i*math.pi/6;x=math.sin(a)*2.85;y=math.cos(a)*2.85;o=cube('Inlay',(x,y,.12),(.18,.36,.05),'ivory',root,.02);o.rotation_euler.z=-a
    if i%3==0:petal('OrganicEngraving',(math.sin(a)*2.6,math.cos(a)*2.6,.11),.4,.1,'sage',root,-a)
cube('Needle',(0,2.6,.16),(.14,.8,.08),'rust',root,.02)

# Convert curves and join only meshes sharing an immediate parent. Animated limb empties remain separate.
bpy.ops.object.select_all(action='DESELECT')
for o in list(bpy.context.scene.objects):
    if o.type=='CURVE':
        o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
for o in list(bpy.context.scene.objects):
    if o.type=='MESH':
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):
            try:bpy.ops.object.modifier_apply(modifier=mod.name)
            except RuntimeError:pass
parents=[o for o in bpy.context.scene.objects if o.type=='EMPTY']
for p in parents:
    children=[o for o in p.children if o.type=='MESH']
    if len(children)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in children:o.select_set(True)
        bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join();bpy.context.object.name=p.name+'_Mesh'
# Save authored source and export all stable top-level roots in one small reusable GLB.
source=ROOT/'assets/source';source.mkdir(parents=True,exist_ok=True);out=ROOT/'public/assets';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source/'glasshouse-kit.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'glasshouse-kit.raw.glb'),export_format='GLB',export_animations=False,export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True)
print('GLASSHOUSE_KIT_EXPORTED',os.path.getsize(out/'glasshouse-kit.raw.glb'))
