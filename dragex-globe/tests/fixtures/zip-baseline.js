// Unchanged ZIP encoding from preservation snapshot 9918e29.
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,i)=>{let n=i;for(let b=0;b<8;b++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
// Uncompressed ZIP; PNG frames are already compressed. No external service,
// encoder, timestamps, or runtime package dependency is needed.
export function zipFrames(entries){
 let offset=0;const chunks=[],central=[];
 for(const {name,data} of entries){
  const filename=encoder.encode(name),crc=crc32(data),header=new Uint8Array(30+filename.length),h=new DataView(header.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(10,0,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,filename.length,true);header.set(filename,30);
  const record=new Uint8Array(46+filename.length),r=new DataView(record.buffer);
  r.setUint32(0,0x02014b50,true);r.setUint16(4,20,true);r.setUint16(6,20,true);r.setUint16(14,33,true);r.setUint32(16,crc,true);r.setUint32(20,data.length,true);r.setUint32(24,data.length,true);r.setUint16(28,filename.length,true);r.setUint32(42,offset,true);record.set(filename,46);
  chunks.push(header,data);central.push(record);offset+=header.length+data.length;
 }
 const size=central.reduce((n,r)=>n+r.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end],{type:'application/zip'});
}
