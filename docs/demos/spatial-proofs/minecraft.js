export default scene({mode:'3d',end:'hold',orbit:false,background:'BLACK'},s=>{
    s.view('voxel-world',{rect:[0,0,1,1],orbit:true,orbitHitTest:'geometry',
      camera:{yaw:-0.44,pitch:-0.21,height:7.2,distance:15,target:[0,1.9,0],perspective:0.65}},v=>{
      // Semantic surface policy keeps the existing color batches and geometry intact.
      function finish(id,color){
        const matte={roughness:.95,specular:.06};
        if(id==='grass-island'){
          if(color==='GREEN_D'||color==='GREEN_E')return {texture:{pattern:'checker',color:color==='GREEN_D'?'GREEN_E':'GREEN_D',scale:8,offset:[.13,.17,.21],seed:7,bumpStrength:.001},material:matte};
          if(color==='GREY_BROWN')return {texture:{pattern:'noise',color:'LIGHT_BROWN',scale:8,seed:31,bumpStrength:.004},material:matte};
        }
        if(id==='oak-crown'&&(color==='GREEN_D'||color==='GREEN_E'))return {texture:{pattern:'checker',color:color==='GREEN_D'?'GREEN_E':'GREEN_D',scale:7.5,offset:[.13,.17,.21],seed:9,bumpStrength:.001},material:matte};
        if(id==='stump'||id.indexOf('log')>=0){
          if(color==='GREY_BROWN')return {texture:{pattern:'wood',color:'LIGHT_BROWN',scale:[3,.3,3],offset:[-3,0,0],seed:19,bumpStrength:.008},material:matte};
          if(color==='GOLD_E')return {texture:{pattern:'wood',color:'LIGHT_BROWN',scale:[3,.3,3],offset:[-3,0,0],seed:19,bumpStrength:.004},material:matte};
        }
        if(id==='pixel-iron-axe'&&color.indexOf('GREY_')===0)return {texture:{pattern:'stripes',color,scale:[12,1,1],seed:3,bumpStrength:.002},material:{metalness:.55,roughness:.5}};
        if((id.indexOf('steve-')===0||id==='mining-upper-arm')&&id!=='steve-head-pivot'&&color.indexOf('BLUE')===0)return {texture:{pattern:'checker',color,scale:18,offset:[.13,.17,.21],seed:5,bumpStrength:.0008},material:matte};
        return {material:matte};
      }
      // Consolidate opaque pixel detail by color. Moving assemblies remain separate.
      function model(id,blocks){
        const buckets={};
        for(const b of blocks){
          const [x,y,z,w,h,d,color]=b;
          const q=buckets[color]||(buckets[color]={vertices:[],triangles:[]});
          const n=q.vertices.length;
          for(const p of [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]])
            q.vertices.push([x+p[0]*w/2,y+p[1]*h/2,z+p[2]*d/2]);
          for(const t of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,4,7],[0,7,3],[1,2,6],[1,6,5],[0,1,5],[0,5,4],[3,7,6],[3,6,2]])
            q.triangles.push(t.map(i=>i+n));
        }
        const parts=[];
        for(const color of Object.keys(buckets))parts.push(v.mesh(id+'-'+color,{...buckets[color],fill:color,shading:'flat',...finish(id,color)}));
        return v.group(id,parts);
      }
      // A cropped island, not a competing landscape. Flat faces retain voxel identity.
      const earth=[];
      for(let ix=-3;ix<=2;ix++)for(let iz=-1;iz<=1;iz++){
        const x=ix+0.5,z=iz;
        if((ix===-3||ix===2)&&iz===-1)continue;
        earth.push([x,-0.26,z,0.994,0.50,0.994,'GREY_BROWN']);
        earth.push([x,-0.025,z,1.002,0.07,1.002,(ix+iz)%3===0?'GREEN_D':'GREEN_E']);
        // Soil inclusions and the irregular grass fringe on visible outer faces.
        if(iz===1)for(let p=0;p<8;p++){
          earth.push([x-0.438+p*0.125,-0.08-(p%3)*0.025,1.501,0.125,0.12+(p%3)*0.05,0.009,'GREEN_E']);
          if(p%2===0)earth.push([x-0.40+p*0.12,-0.29-(p%3)*0.035,1.503,0.10,0.06,0.011,'LIGHT_BROWN']);
        }
        if(ix===-3)for(let p=0;p<7;p++)earth.push([-3.003,-0.20-(p%3)*0.055,z-0.4+p*0.12,0.011,0.08,0.07,p%2?'LIGHT_BROWN':'DARK_BROWN']);
        for(let p=0;p<4;p++)earth.push([x-0.32+(p%2)*0.47,0.013,z-0.28+Math.floor(p/2)*0.51,0.20,0.006,0.12,(p+ix+iz)%2?'GREEN_D':'GREEN_E']);
      }
      model('grass-island',earth);
      function log(id,y){
        const b=[[1,y,0,1,1,1,'GREY_BROWN']];
        for(let p=0;p<8;p++){
          const q=-0.4375+p/8;
          {
            b.push([0.494,y+((p%3)-1)*0.0625,q,0.014,0.85-(p%3)*0.08,0.072,p%3?'DARK_BROWN':'LIGHT_BROWN']);
            b.push([1+q,y+((p%2)-0.5)*0.07,0.507,0.065,0.84-(p%3)*0.09,0.014,p%3?'DARK_BROWN':'LIGHT_BROWN']);
          }
        }
        // End grain, visible on stump and floating log after the cut.
        b.push([1,y+0.504,0,0.85,0.015,0.85,'GOLD_E']);
        for(let k=0;k<3;k++){
          const r=0.64-k*0.18;
          b.push([1,y+0.515, r/2,r,0.01,0.025,'LIGHT_BROWN'],[1,y+0.515,-r/2,r,0.01,0.025,'LIGHT_BROWN']);
          b.push([1-r/2,y+0.515,0,0.025,0.01,r,'LIGHT_BROWN'],[1+r/2,y+0.515,0,0.025,0.01,r,'LIGHT_BROWN']);
        }
        return model(id,b);
      }
      log('stump',0.5);
      const target=log('struck-log',1.5);
      log('upper-log',2.5);log('crown-log',3.5);
      const leaves=[];
      for(let layer=0;layer<3;layer++){
        const y=3.05+layer*0.68,r=layer===2?1:2;
        for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){
          if((Math.abs(a)===r&&Math.abs(b)===r)||(a===0&&b===0&&layer<2))continue;
          if(layer===0&&a===-2&&b===1)continue;
          const x=1+a*0.67,z=b*0.67;
          leaves.push([x,y,z,0.69,0.69,0.69,(a+b+layer)%3===0?'GREEN_D':'GREEN_E']);
          // Sparse raised pixels break broad solid faces while keeping a cubic canopy.
          if(b===r)for(let p=0;p<3;p++)leaves.push([x-0.22+p*0.20,y+((p+a+4)%3-1)*0.17,z+0.351,0.12,0.12,0.014,p%2?'GREEN_D':'GREEN']);
          if(layer===2)leaves.push([x+0.12,y+0.352,z-0.12,0.21,0.013,0.16,'GREEN_D']);
        }
      }
      model('oak-crown',leaves);
      // Steve: 8-pixel head, 12-pixel torso and legs, 4-pixel-wide limbs.
      const cx=-1.375,u=0.0625;
      const torso=model('steve-torso',[[cx,1.125,0,0.5,0.75,0.25,'BLUE_D'],
        [cx,1.395,0.133,0.125,0.10,0.015,'GOLD_A'],[cx,1.07,0.133,0.063,0.40,0.014,'BLUE_E'],
        [cx-0.14,0.82,0.133,0.10,0.10,0.013,'BLUE_E'],[cx+0.18,0.90,0.134,0.062,0.16,0.014,'BLUE']]);
      for(let k=0;k<2;k++){
        const x=cx+(k?0.14:-0.14);
        model('steve-leg-'+k,[[x,0.40,0,0.245,0.72,0.25,'BLUE_E'],[x,0.05,0.025,0.25,0.10,0.30,'GREY_D'],
          [x+(k?0.07:-0.07),0.49,0.132,0.055,0.42,0.014,'BLUE_D'],[x,0.23,0.133,0.16,0.063,0.014,'GREY_BROWN']]);
      }
      const headBlocks=[[0,0,0,0.50,0.50,0.50,'GOLD_A'],[0,0.225,0,0.51,0.0625,0.51,'GREY_E'],
        [0,0,-0.235,0.51,0.46,0.042,'GREY_E'],[-0.238,0.15,0,0.034,0.19,0.5,'GREY_BROWN'],[0.238,0.15,0,0.034,0.19,0.5,'GREY_BROWN']];
      const face=['hhhhhhhh','hhhhhhhh','hssssssh','swbssbws','ssssssss','sssnnsss','ssmmmmss','ssmmmmss'];
      const colors={h:'GREY_E',s:'GOLD_A',w:'WHITE',b:'BLUE_E',n:'LIGHT_BROWN',m:'GREY_BROWN'};
      for(let row=0;row<8;row++)for(let col=0;col<8;col++){
        const c=face[row][col];if(c==='s'||!colors[c])continue;
        headBlocks.push([-0.21875+col*u,0.21875-row*u,0.255,u,u,0.014,colors[c]]);
      }
      // Mouth interrupts the beard; square nose projects by half a pixel.
      headBlocks.push([0,-0.156,0.268,0.125,0.038,0.025,'DARK_BROWN'],[0,-0.065,0.275,0.115,0.07,0.045,'GOLD_E']);
      const head=model('steve-head-pivot',headBlocks);
      v.play(head.moveTo([cx,1.75,0]),{duration:0});
      const idleArm=model('steve-left-arm',[[0,-0.14,0,0.25,0.28,0.25,'BLUE_D'],[0,-0.51,0,0.25,0.46,0.25,'GOLD_A'],
        [0,-0.69,0.129,0.14,0.07,0.014,'GOLD_E']]);
      v.play(idleArm.moveTo([cx-0.375,1.43,0]),{duration:0});
      const upper=model('mining-upper-arm',[[0,-0.14,0,0.25,0.28,0.25,'BLUE_D'],[0,-0.325,0,0.25,0.09,0.25,'GOLD_A']]);
      const forearm=model('mining-forearm',[[0,-0.18,0,0.25,0.36,0.25,'GOLD_A'],[0,-0.325,0.13,0.13,0.06,0.016,'GOLD_E']]);
      const axePixels=[];
      // Shaft runs through the hand. The blade's far face is exactly y=-1.625.
      for(let j=0;j<11;j++)axePixels.push([0,-0.72-j*0.0625,0.015,0.073,0.073,0.073,j%3?'LIGHT_BROWN':'DARK_BROWN']);
      const blade=[[0,-1.38],[0.0625,-1.38],[0.125,-1.38],[0.1875,-1.38],[0.25,-1.38],
        [0,-1.4425],[0.0625,-1.4425],[0.125,-1.4425],[0.1875,-1.4425],[0.25,-1.4425],
        [0.0625,-1.505],[0.125,-1.505],[0.1875,-1.505],[0.25,-1.505],
        [0.125,-1.5675],[0.1875,-1.5675],[0.25,-1.5675],[0.1875,-1.59375],[0.25,-1.59375]];
      for(let i=0;i<blade.length;i++)axePixels.push([blade[i][0],blade[i][1],0.015,0.0625,0.0625,0.13,i>13?'GREY_A':i%4===0?'GREY_B':'GREY_C']);
      const axe=model('pixel-iron-axe',axePixels);
      const elbow=v.group('mining-elbow',[forearm]);
      v.play(elbow.moveTo([0,-0.37,0]),{duration:0});
      const shoulder=v.group('mining-shoulder',[upper,elbow,axe]);
      v.play([shoulder.moveTo([-1.125,1.43,0.27]),shoulder.rotateTo([0,0,1.08])],{duration:0});
      // Cracks are voxel steps on the contacted left face, progressively revealed.
      const cracks=[];
      const paths=[[[1.68,0.32],[1.60,0.32],[1.60,0.24],[1.50,0.24],[1.50,0.15]],
        [[1.60,0.24],[1.62,0.24],[1.62,0.11],[1.73,0.11],[1.73,-0.05]],
        [[1.50,0.15],[1.33,0.15],[1.33,-0.02],[1.22,-0.02],[1.22,-0.21]],
        [[1.62,0.11],[1.62,-0.10],[1.82,-0.10],[1.82,-0.29]]];
      for(let j=0;j<paths.length;j++){
        const pixels=[];const p=paths[j];
        for(let k=1;k<p.length;k++){
          const a=p[k-1],b=p[k];pixels.push([0.482,(a[0]+b[0])/2,(a[1]+b[1])/2,0.013,Math.abs(a[0]-b[0])+0.024,Math.abs(a[1]-b[1])+0.024,'GREY_E']);
        }
        const c=model('damage-'+j,pixels);v.play(c.animate({opacity:0}),{duration:0});cracks.push(c);
      }
      const chips=[];
      for(let i=0;i<6;i++){
        const c=v.box('wood-chip-'+i,{width:0.065,height:0.07,depth:0.055,fill:i%2?'LIGHT_BROWN':'DARK_BROWN',position:[0.47,1.66,0.30],opacity:0,texture:{pattern:'wood',color:'GREY_BROWN',scale:3,seed:19,bumpStrength:.002},material:{roughness:.95,specular:.06}});chips.push(c);
      }
      // A separate inventory representation appears only when the world block leaves.
      const drop=model('collected-log',[[0,0,0,0.31,0.31,0.31,'GREY_BROWN'],[0,0.159,0,0.27,0.012,0.27,'GOLD_E'],
        [-0.159,0,-0.08,0.012,0.28,0.04,'DARK_BROWN'],[-0.159,0,0.06,0.012,0.28,0.04,'LIGHT_BROWN'],[0.06,0,0.159,0.04,0.28,0.012,'DARK_BROWN']]);
      v.play(drop.animate({opacity:0,position:[0.42,1.38,0.34]}),{duration:0});
      v.wait(1.15);
      // Strike rhythm: backswing, approach, exact contact, damage, recoil and rest.
      for(let hit=0;hit<3;hit++){
        v.play([shoulder.rotateTo([0,0,2.30]),head.rotateTo([0,0.20,0])],{duration:1,ease:'smooth'});
        v.play(shoulder.rotateTo([0,0,Math.PI/2]),{duration:0.85,ease:'smooth'});
        v.play(cracks[Math.min(hit,2)].animate({opacity:1}),{duration:0});
        if(hit===2)v.play(cracks[3].animate({opacity:1}),{duration:0});
        for(let i=0;i<chips.length;i++)v.play(chips[i].animate({position:[0.475,1.66,0.30],opacity:1}),{duration:0});
        v.play(chips.map((c,i)=>c.moveTo([0.03-(i%3)*0.12,1.42+(i%2)*0.16,0.28+(i-2.5)*0.10])),{duration:0.16,ease:'linear'});
        v.play(chips.map((c,i)=>c.animate({position:[-0.12-(i%3)*0.13,1.20-(i%2)*0.06,0.28+(i-2.5)*0.13],opacity:0})),{duration:0.24,ease:'linear'});
        if(hit<2){
          v.play(shoulder.rotateTo([0,0,1.24]),{duration:0.45,ease:'smooth'});
          v.wait(0.3);
        }
      }
      // The third impact precedes release. Voxel-world suspended canopy stays intact.
      v.play([target.animate({opacity:0}),...cracks.map(c=>c.animate({opacity:0})),drop.animate({opacity:1})],{duration:0});
      v.play([shoulder.rotateTo([0,0,1.02]),drop.moveTo([-0.05,0.55,0.48]),drop.rotateTo([0.15,0.45,0.18])],{duration:0.5,ease:'linear'});
      v.play(drop.moveTo([-0.15,0.19,0.52]),{duration:0.23,ease:'linear'});
      v.play(drop.moveTo([-0.20,0.31,0.54]),{duration:0.18,ease:'smooth'});
      v.play([drop.moveTo([-0.24,0.19,0.56]),head.rotateTo([0,0.1,0])],{duration:0.2,ease:'smooth'});
      v.wait(5.49);
    });
  });