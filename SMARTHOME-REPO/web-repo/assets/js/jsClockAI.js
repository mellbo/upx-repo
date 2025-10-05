// ======== WHEEL PICKER CLASA ========
class WheelPicker {
  constructor(containerId, values) {
    this.container = document.getElementById(containerId);
    this.values = values;
    this.currentY = 0;
    this.velocity = 0;
    this.animating = false;
    this.itemHeight = 40;
    this.minY = -(values.length -1)*this.itemHeight;
    this.maxY = 0;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = '<div class="wheel-items"></div>';
    this.itemsEl = this.container.querySelector('.wheel-items');
    this.values.forEach(function(val, i){
      const div = document.createElement('div');
      div.className = 'wheel-item';
      div.textContent = val.toString().padStart(2,'0');
      this.itemsEl.appendChild(div);
    }.bind(this));
    this.updateSelection();
    this.itemsEl.style.transform = 'translateY(' + this.currentY + 'px)';
  }

  bindEvents() {
    let isDragging = false;
    let lastY = 0;
    const self = this;

    function start(e){
      isDragging=true;
      lastY = e.touches ? e.touches[0].clientY : e.clientY;
      e.preventDefault();
    }

    function move(e){
      if(!isDragging) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      let delta = y - lastY;
      self.currentY += delta;
      if(self.currentY>self.maxY) self.currentY = self.maxY + (self.currentY-self.maxY)/3;
      if(self.currentY<self.minY) self.currentY = self.minY + (self.currentY-self.minY)/3;
      self.itemsEl.style.transform = 'translateY(' + self.currentY + 'px)';
      self.velocity = delta;
      lastY = y;
      self.updateSelection();
    }

    function end(){
      isDragging=false;
      self.startInertia();
    }

    this.container.addEventListener('mousedown', start);
    this.container.addEventListener('mousemove', move);
    this.container.addEventListener('mouseup', end);
    this.container.addEventListener('mouseleave', end);
    this.container.addEventListener('touchstart', start);
    this.container.addEventListener('touchmove', move);
    this.container.addEventListener('touchend', end);
  }

  startInertia() {
    if(this.animating) return;
    this.animating = true;
    const self = this;

    function step(){
      if(Math.abs(self.velocity)<0.1){
        self.snapToItem();
        self.animating=false;
        return;
      }
      self.currentY += self.velocity;
      if(self.currentY>self.maxY){ self.currentY=self.maxY; self.velocity=0;}
      if(self.currentY<self.minY){ self.currentY=self.minY; self.velocity=0;}
      self.itemsEl.style.transform = 'translateY(' + self.currentY + 'px)';
      self.velocity *= 0.95;
      self.updateSelection();
      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  snapToItem() {
    const index = Math.round(-this.currentY/this.itemHeight);
    this.currentY = -index*this.itemHeight;
    this.itemsEl.style.transform = 'translateY(' + this.currentY + 'px)';
    this.updateSelection();
  }

  updateSelection() {
    const index = Math.round(-this.currentY/this.itemHeight);
    Array.from(this.itemsEl.children).forEach(function(el,i){
      el.classList.toggle('selected', i===index);
    });
  }
  
  getSelected(){
    const index = Math.round(-this.currentY/this.itemHeight);
    return this.values[index];
  }

  setSelected(value){
    const index = this.values.indexOf(value);
    if(index>=0){
      this.currentY = -index*this.itemHeight;
      this.itemsEl.style.transform = 'translateY(' + this.currentY + 'px)';
      this.updateSelection();
    }
  }
}

let horizontalWheel;
class HorizontalWheelPicker {
  constructor(containerId, values) {
    this.container = document.getElementById(containerId);
    this.values = values;
    this.currentX = 0;
    this.velocity = 0;
    this.animating = false;
    this.itemWidth = 60; // conform CSS
    this.minX = -(values.length -1)*this.itemWidth;
    this.maxX = 0;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = '<div class="wheel-items"></div>';
    this.itemsEl = this.container.querySelector('.wheel-items');
    for(let i=0;i<this.values.length;i++){
      const div = document.createElement('div');
      div.className = 'wheel-item';
      div.textContent = this.values[i];
      this.itemsEl.appendChild(div);
    }
    this.updateSelection();
    this.itemsEl.style.transform = 'translateX(' + this.currentX + 'px)';
  }

  bindEvents() {
    let isDragging=false;
    let lastX=0;
    const self=this;

    function start(e){
      isDragging=true;
      lastX = e.touches ? e.touches[0].clientX : e.clientX;
      e.preventDefault();
    }

    function move(e){
      if(!isDragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      let delta = x - lastX;
      self.currentX += delta;
      if(self.currentX>self.maxX) self.currentX = self.maxX + (self.currentX-self.maxX)/3;
      if(self.currentX<self.minX) self.currentX = self.minX + (self.currentX-self.minX)/3;
      self.itemsEl.style.transform = 'translateX(' + self.currentX + 'px)';
      self.velocity = delta;
      lastX = x;
      self.updateSelection();
    }

    function end(){
      isDragging=false;
      self.startInertia();
    }

    this.container.addEventListener('mousedown', start);
    this.container.addEventListener('mousemove', move);
    this.container.addEventListener('mouseup', end);
    this.container.addEventListener('mouseleave', end);
    this.container.addEventListener('touchstart', start);
    this.container.addEventListener('touchmove', move);
    this.container.addEventListener('touchend', end);
  }

  startInertia() {
    if(this.animating) return;
    this.animating = true;
    const self=this;

    function step(){
      if(Math.abs(self.velocity)<0.1){
        self.snapToItem();
        self.animating=false;
        return;
      }
      self.currentX += self.velocity;
      if(self.currentX>self.maxX){ self.currentX=self.maxX; self.velocity=0;}
      if(self.currentX<self.minX){ self.currentX=self.minX; self.velocity=0;}
      self.itemsEl.style.transform = 'translateX(' + self.currentX + 'px)';
      self.velocity *= 0.95;
      self.updateSelection();
      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  snapToItem() {
    const index = Math.round(-this.currentX/this.itemWidth);
    this.currentX = -index*this.itemWidth;
    this.itemsEl.style.transform = 'translateX(' + this.currentX + 'px)';
    this.updateSelection();
  }

  updateSelection() {
    const index = Math.round(-this.currentX/this.itemWidth);
    Array.from(this.itemsEl.children).forEach(function(el,i){
      el.classList.toggle('selected', i===index);
    });
  }
  
  getSelected(){
    const index = Math.round(-this.currentX/this.itemWidth);
    return this.values[index];
  }
  
  setSelected(value){
    const index = this.values.indexOf(value);
    if(index>=0){
      this.currentX = -index*this.itemWidth;
      this.itemsEl.style.transform = 'translateX(' + this.currentX + 'px)';
      this.updateSelection();
    }
  }
}

// ======== INIT ROȚI ========
let hoursWheel, minutesWheel;
window.onload = function(){
  const hours = Array.from({length:24}, function(_,i){return i;});
  const minutes = Array.from({length:60}, function(_,i){return i;});
  hoursWheel = new WheelPicker('hoursWheel', hours);
  minutesWheel = new WheelPicker('minutesWheel', minutes);

  const horizontalValues = [];
  for(let v=12; v<=38; v+=0.1){ //v+=0.5
    //horizontalValues.push(v);
    horizontalValues.push(parseFloat(v.toFixed(1)));
  }
  horizontalWheel = new HorizontalWheelPicker('horizontalWheel', horizontalValues);
};

// ======== MODAL FUNC ========
function openTimePicker(startTemp){
  const now = new Date();
  hoursWheel.setSelected(now.getHours());
  minutesWheel.setSelected(now.getMinutes());
  if(horizontalWheel && startTemp !== undefined){
    horizontalWheel.setSelected(startTemp); // setează valoarea inițială la roata orizontală
  }  
  $('#timePickerModal').modal('show');
}

$('#timePickerOkBtn').on('click', function(){
  let h = hoursWheel.getSelected().toString().padStart(2,'0');
  let m = minutesWheel.getSelected().toString().padStart(2,'0');
  let extra = horizontalWheel.getSelected().toString().padStart(2,'0');
  const timeString = h + ':' + m;
  console.log('Ora selectată:', timeString, 'Extra:', extra);
  alert('Ai ales ora: ' + timeString + ' și valoarea extra: ' + extra);
  $('#timePickerModal').modal('hide');
});
