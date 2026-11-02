export class GoldHold {
 constructor(){this.reset()}
 reset(){this.held={small:false,big:false};this.latched={small:false,big:false}}
 down(channel){if(this.latched[channel]){this.latched[channel]=false;this.held[channel]=false}else this.held[channel]=true;return this.state()}
 up(channel){this.held[channel]=false;return this.state()}
 blur(){for(const c of ['small','big']){if(this.held[c])this.latched[c]=true;this.held[c]=false}return this.state()}
 state(){const small=this.held.small||this.latched.small,big=this.held.big||this.latched.big;return {kind:small&&big?'both':big?'big':small?'small':'',persistent:this.latched.small||this.latched.big}}
}
