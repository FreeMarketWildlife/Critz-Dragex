import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.fps=5;scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
editor=scene.sequence_editor_create();files=sorted(f for f in os.listdir(os.path.join(ROOT,'movie-frames')) if f.endswith('.png'))
assert len(files)==220
strip=editor.strips.new_image('Rendered animation',filepath=os.path.join(ROOT,'movie-frames',files[0]),channel=1,frame_start=1)
for f in files[1:]:strip.elements.append(f)
strip.frame_final_duration=len(files)
scene.frame_start=1;scene.frame_end=len(files)
for start,end,text in [(1,41,'Flight to Lake Moana'),(41,81,'Attack at the lake'),(81,121,'Return to Mount Yokai'),(121,161,'Walk toward the mountain'),(161,221,'Burrow beneath Mount Yokai')]:
    caption=editor.strips.new_effect('Story caption',type='TEXT',channel=2,frame_start=start,length=end-start)
    caption.text=text;caption.font_size=26;caption.location=(.5,.065);caption.color=(1,1,1,1);caption.use_shadow=True
scene.render.image_settings.media_type='VIDEO';scene.render.image_settings.file_format='FFMPEG';scene.render.ffmpeg.format='MPEG4';scene.render.ffmpeg.codec='H264';scene.render.ffmpeg.constant_rate_factor='MEDIUM';scene.render.ffmpeg.audio_codec='NONE'
scene.render.filepath=os.path.join(ROOT,'dragex-moana-animation-study.mp4')
bpy.ops.render.render(animation=True)
scene.frame_set(56);scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(ROOT,'movie-preview.png');bpy.ops.render.render(write_still=True)
