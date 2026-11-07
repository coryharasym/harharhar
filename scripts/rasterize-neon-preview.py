"""Resolve the actual ship's intersecting armor with a small software depth buffer."""
import json
import numpy as np
from PIL import Image
image=np.array(Image.open('/tmp/neon-preview-background.png').convert('RGB'),dtype=float)
h,w,_=image.shape
zbuffer=np.full((h,w),np.inf)
faces=json.load(open('/tmp/neon-preview-ship.json'))
faces.sort(key=lambda f:(f['opacity']<.99,-sum(p[2] for p in f['points'])))
for face in faces:
    points=np.array(face['points']);points[:,:2]*=1.5
    for k in range(1,len(points)-1):
        a,b,c=points[[0,k,k+1]]
        xmin=max(0,int(np.floor(min(a[0],b[0],c[0]))));xmax=min(w-1,int(np.ceil(max(a[0],b[0],c[0]))))
        ymin=max(0,int(np.floor(min(a[1],b[1],c[1]))));ymax=min(h-1,int(np.ceil(max(a[1],b[1],c[1]))))
        if xmax<xmin or ymax<ymin:continue
        den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-8:continue
        yy,xx=np.mgrid[ymin:ymax+1,xmin:xmax+1];xx=xx+.5;yy=yy+.5
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;t=1-u-v
        depth=u*a[2]+v*b[2]+t*c[2]
        target=zbuffer[ymin:ymax+1,xmin:xmax+1]
        mask=(u>=0)&(v>=0)&(t>=0)&(depth<=target+1e-8)
        region=image[ymin:ymax+1,xmin:xmax+1];color=np.array([int(face['hex'][i:i+2],16) for i in [0,2,4]])
        alpha=face['opacity'];region[mask]=region[mask]*(1-alpha)+color*alpha
        if alpha>=.99:target[mask]=depth[mask]
Image.fromarray(np.clip(image,0,255).astype('uint8')).save('public/neon-dodger-preview.webp',quality=93,method=6)
