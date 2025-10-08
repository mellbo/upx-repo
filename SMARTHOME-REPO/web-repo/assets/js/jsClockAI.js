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
/* HORIZONTAL  * HORIZONTAL */
class HorizontalWheelPicker {
	constructor({ containerId, min, max, step, initialValue }) {
		this.container = document.getElementById(containerId);
		this.min = min;
		this.max = max;
		this.step = step;
		this.values = [];
		for(let v = min; v <= max + 0.0001; v += step){
			this.values.push(parseFloat(v.toFixed(1)));
		}

		this.currentX = 0;
		this.velocity = 0;
		this.isDragging = false;
		this.lastX = 0;
		this.frame = null;

		this.createUI();
		this.setToValue(initialValue);
		this.bindEvents();
		this.animate();
	}

	createUI() {
		this.wheel = document.createElement('div');
		this.wheel.className = 'Hwheel';
		this.values.forEach(v => {
			const div = document.createElement('div');
			div.className = 'Hwheel-item';
			div.textContent = v.toFixed(1);
			this.wheel.appendChild(div);
		});
		this.container.appendChild(this.wheel);

		const marker = document.createElement('div');
		marker.className = 'center-marker';
		this.container.appendChild(marker);
	}

	bindEvents() {
		const onMove = e => {
			if(!this.isDragging){return;}
			const x = e.touches ? e.touches[0].clientX : e.clientX;
			const dx = x - this.lastX;
			this.currentX += dx;
			this.velocity = dx * 1.0; //velocity
			this.lastX = x;
		};

		const onDown = e => {
			this.isDragging = true;
			this.velocity = 0;
			this.lastX = e.touches ? e.touches[0].clientX : e.clientX;
			cancelAnimationFrame(this.frame);
		};

		const onUp = () => {
			this.isDragging = false;
			this.snapToNearest();
			this.animate();
		};

		this.container.addEventListener('mousedown', onDown);
		this.container.addEventListener('touchstart', onDown);
		window.addEventListener('mousemove', onMove);
		window.addEventListener('touchmove', onMove);
		window.addEventListener('mouseup', onUp);
		window.addEventListener('touchend', onUp);
	}

	setToValue(value) {
		const index = this.values.findIndex(v => v === parseFloat(value.toFixed(1)));
		if(index >= 0){
			this.currentX = ((-index * 80) + (this.container.offsetWidth / 2) - 40);
			this.updateActive();
			this.wheel.style.transform = `translateX(${this.currentX}px)`;
		}
	}

	updateActive() {
		const center = this.container.offsetWidth / 2;
		const items = this.wheel.children;
		let closestIndex = 0;
		let closestDist = Infinity;

		for(let i = 0; i < items.length; i++){
			const itemCenter = this.currentX + i * 80 + 40;
			const dist = Math.abs(center - itemCenter);
			if(dist < closestDist){
				closestDist = dist;
				closestIndex = i;
			}
			items[i].classList.remove('active');
		}

		items[closestIndex].classList.add('active');
		this.selectedValue = this.values[closestIndex];
	}

	snapToNearest() {
		const center = this.container.offsetWidth / 2;
		let nearestIndex = Math.round((center - this.currentX - 40) / 80);
		if(nearestIndex < 0){nearestIndex = 0;}
		if(nearestIndex >= this.values.length){nearestIndex = this.values.length - 1;}
		this.currentX = -nearestIndex * 80 + center - 40;
		this.updateActive();
	}

	getSelectedValue() {
		return this.selectedValue;
	}

	animate() {
		if(!this.isDragging){
			this.currentX += this.velocity;
			this.velocity *= 0.98; //brake def 0.95
			if(Math.abs(this.velocity) < 0.05){
				this.velocity = 0;
				this.snapToNearest();
			}
		}
		this.wheel.style.transform = `translateX(${this.currentX}px)`;
		this.updateActive();
		this.frame = requestAnimationFrame(() => this.animate());
	}
}