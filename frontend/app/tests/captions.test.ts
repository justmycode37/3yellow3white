import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captionAt} from '../src/captions.ts';
const scenes=[{duration:10,captions:[{start:1,end:3,text:'First'}]},{duration:5,captions:[{start:0,end:2,text:'Second'}]}] as Parameters<typeof captionAt>[0];
test('subtitles follow scene boundaries, seeks, and silent gaps',()=>{
 assert.equal(captionAt(scenes,0),'');assert.equal(captionAt(scenes,1),'First');assert.equal(captionAt(scenes,3),'');
 assert.equal(captionAt(scenes,10),'Second');assert.equal(captionAt(scenes,12),'');assert.equal(captionAt(scenes,15),'');assert.equal(captionAt(scenes,2),'First');
});
