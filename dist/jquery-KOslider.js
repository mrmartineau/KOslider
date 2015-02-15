/**
 * debounce
 * @param {integer} milliseconds This param indicates the number of milliseconds
 *     to wait after the last call before calling the original function .
 * @return {function} This returns a function that when called will wait the
 *     indicated number of milliseconds after the last call before
 *     calling the original function.
 */
Function.prototype.debounce = function (milliseconds) {
	var baseFunction = this,
		timer = null,
		wait = milliseconds;

	return function () {
		var self = this,
			args = arguments;

		function complete() {
			baseFunction.apply(self, args);
			timer = null;
		}

		if (timer) {
			clearTimeout(timer);
		}

		timer = setTimeout(complete, wait);
	};
};

/**
 * KOslider by @mrmartineau
 *
 * See https://github.com/mrmartineau/KOslider for documentation and demos
 */

(function($, f) {
	var KOslider = function() {
		//  Object clone
		var _ = this;

		// Set some default options
		_.options = {
			keys             : false,
			dots             : true,
			dotsClick        : false,
			arrows           : true,
			sliderEl         : '.KOslider',
			slide            : '.KOslider-slide',
			uiPosition       : 'before',
			customPrevClass  : 'icon-arrow-previous',
			customNextClass  : 'icon-arrow-next',
			debug            : false,
			setHeight        : "auto",
			autoplay         : false,
			autoplayInterval : 4000,
			swipe            : false,
			itemWidth        : undefined,
			inactiveClass    : 'KOslider--inactive',
			activeClass      : 'KOslider--active',
			callbacks        : {}
		};

		_.init = function(el, options) {
			//  Check whether we're passing any options in to KOslider
			_.options = $.extend(_.options, options);
			_.el      = el; // .KOsliderContainer
			_.slider  = el.find(_.options.sliderEl);
			_.slide   = _.slider.find(_.options.slide);
			if (_.options.debug) { console.log('KOslider :: options', _.options, 'options', options); }

			// If fewer than 2 children do not setup KOslider
			if ( _.slide.length < 2) {
				el.addClass(_.options.inactiveClass);
				if (_.options.debug) { console.log('KOslider :: not enough elements to make a slider', options); }
				return;
			}

			// el.addClass(_.options.activeClass);

			//  Cached vars
			var options = _.options;
			var slide   = _.slide;
			var len     = slide.length;

			// Set up some other vars
			_.leftOffset = 0;
			_.index      = 0; // Current index
			_.min        = 0;
			_.count      = len - 1;

			// Resize: Check and change sizes if needed
			$(window).resize($.proxy(_.getWidth.debounce(500), this)).trigger('resize');

			_.el.on('click', '.KOslider-UI-btn', function(event) {
				event.preventDefault();
				var fn = $(this).data('fn'); // Choose next or prev
				_[fn]();
			});

			//  Keypresses
			if (options.keys) { _.keypresses(); }

			// Clickable dots
			if (options.dotsClick) { _.dotsClick(); }

			// Autoplay
			if (options.autoplay) { _.autoplay(); }

			// Autoplay
			if (options.swipe) { _.swipe(); }

			return _;
		};


		$.fn.KOslider.destroy = function() {
			_.slider.css('width', 'auto').data({KOslider: undefined, key: undefined});
			_.slider.find('.KOslider-UI').remove();
			_.slide.css('width', 'auto');
		};


		/**
		 * Go to slide
		 * @return {integer} Go to slide
		 * Value should be zero-indexed number for particular e.g. 0, 1, 2 etc
		 */
		_.goto = function(x) {
			if (_.tooThin) {
				_.leftOffset = 0;
				_.reachedEnd = false;
			} else if (_.leftOffset < _.max || -(x * _.itemWidth) < _.max) {
				_.leftOffset = _.max;
				_.reachedEnd = true;
				if (_.options.debug) { console.log('KOslider :: reachedEnd = true'); }
			} else {
				_.leftOffset = -(x * _.itemWidth);
				_.reachedEnd = false;
				if (_.options.debug) { console.log('KOslider :: reachedEnd = false'); }
			}

			_.index = x;

			_.setHeight(x);

			_.slider.css('transform', 'translateX(' + _.leftOffset + 'px)');

			if (_.options.debug) {
				console.log('KOslider :: _.goto() :: \n\tx', x, '\n\tleftOffset:', _.leftOffset, '\n\tindex', _.index, '\n\titemWidth:', _.itemWidth, '\n\tmove amount:', _.leftOffset / _.index, '\n\tshould move amount:', _.itemWidth);
			}

			_.navState();

			if (_.options.callbacks.onChange !== undefined) {
				eval(_.options.callbacks.onChange);
			}
			//_.tracking();
		};

		/**
		 * Move to next item
		 */
		_.next = function() {
			var moveTo;
			if (_.index < _.count) {
				moveTo = _.index + 1;
			} else {
				moveTo = _.count;
				return;
			}
			if (_.options.debug) {
				console.log('KOslider :: next() :: \n\t_.index', _.index, '\n\tmove to:', _.leftOffset - _.itemWidth, '\n\tmoveTo', moveTo);
			}

			_.goto(moveTo);
		};

		/**
		 * Move to previous item
		 */
		_.prev = function() {
			var moveTo;
			if (_.index > 0) {
				moveTo = _.index - 1;
			} else {
				moveTo = 0;
				return;
			}
			if (_.options.debug) {
				console.log('KOslider :: prev() :: \n\t_.index', _.index, '\n\tmove to:', _.leftOffset + _.itemWidth, '\n\tmoveTo', moveTo);
			}

			_.goto(moveTo);
		};


		/**
		 * Change nav state
		 */
		_.navState = function() {
			var atStart;
			var atEnd;

			// Enable/Disable the prev btn
			if (_.index === 0) {
				atStart = true;
			} else {
				atStart = false;
			}

			// Enable/Disable the next btn.
			if (_.index === _.count || _.reachedEnd) {
				atEnd = true;
			} else {
				atEnd = false;
			}

			_.el.find('.KOslider-UI-btn--previous').prop('disabled', atStart);
			_.el.find('.KOslider-UI-btn--next').prop('disabled', atEnd);

			// Set first dot to be active
			_.el.find('.KOslider-UI-dot').eq(_.index).addClass('is-active').siblings().removeClass('is-active');
		};

		/**
		 * Get size of .slider and then run _.setSizes()
		 */
		_.getWidth = function() {
			_.itemWidth = parseInt(_.options.itemWidth) > 0 ? parseInt(_.options.itemWidth) : _.el.width();
			_.setSize(_.itemWidth);
		};


		/**
		 * Set sizes for element
		 */
		_.setSize = function(itemWidth) {
			var $containerWidth = _.el.width();               // Container width
			var $sliderWidth    = _.slide.length * itemWidth; // full width of slider with all items floated
			_.max               = Math.round(-($sliderWidth - $containerWidth));
			_.leftOffset        = -(itemWidth * _.index);

			_.slider.css({
				width    : Math.round($sliderWidth),
				transform: 'translateX(' + _.leftOffset + 'px)'
			});
			_.slide.css({ width: itemWidth });

			_.setHeight(_.index);

			// Create UI if there is enough space to do so
			if ($sliderWidth > $containerWidth) {
				// Create UI - Dots and next/prev buttons
				if (_.el.find('.KOslider-UI').length === 0) {
					_.createUI();
					_.tooThin = false;
					if (_.options.debug) { console.log('Create UI'); }
				}
			} else {
				_.el.find('.KOslider-UI').remove();
				_.tooThin = true;
				if (_.leftOffset !== 0) {
					_.leftOffset = 0;
					_.goto(0);
				}
				if (_.options.debug) { console.log('remove the UI'); }
			}

			if (_.options.debug) {
				console.log('KOslider :: _.setSize() :: \n\t_.max:', _.max , '\n\t_.min:', _.min, '\n\tleftOffset:', _.leftOffset, '\n\tindex', _.index, '\n\titemWidth:', _.itemWidth, '\n\t_.slide.length', _.slide.length, '\n\t$sliderWidth', $sliderWidth, '\n\t_.el.width()', _.el.width(), '_.el.find(\'.KOslider\').width()\')', _.el.find('.KOslider').width());
			}
		};


		/**
		 * Set height of <ul> based on heightChange option
		 */
		_.setHeight = function(eq) {
				if (_.options.setHeight == "auto") {
					var newHeight = _.slide.eq(eq).height();
					_.slider.height(newHeight);
				} else if(_.options.setHeight == "equal") {
					_.equalizeHeights();
				}
		};


		/**
		 * Equalise Heights _.equalizeHeights()
		 */
		_.equalizeHeights = function() {
			if (_.options.debug) { console.log('Equal true'); }
			var highestBox = 0;
			var $equaliseEl = _.options.equaliseEl;

			_.slider.find($equaliseEl).each(function(){
				$(this).removeAttr('style');

				if( $(this).height() > highestBox ) {
					highestBox = $(this).height();
				}
			});
			_.slider.find($equaliseEl).css('height', highestBox);
			if (_.options.debug) { console.log('KOslider :: _.equalizeHeights() :: \n\thighestBox:', highestBox); }
		};


		/**
		 * Create the UI
		 * Dots : will show if dots = true
		 * Arrows : will show if arrows = true
		 */
		_.createUI = function() {
			html = '<div class="KOslider-UI KOslider-UI--' + _.options.uiPosition + ' clearfix"><div class="KOslider-UI-pagers">';

			if (_.options.arrows) {
				html += '<button class="KOslider-UI-btn KOslider-UI-btn--previous ' + _.options.customPrevClass + '" data-fn="prev" disabled>Previous</button>';
			}

			if (_.options.dots) {
				html += '<div class="KOslider-UI-dots">';
				$.each(_.slide, function() {
					html += '<span class="KOslider-UI-dot"></span>';
				});
				html += '</div>';
			}

			if (_.options.arrows) {
				html += '<button class="KOslider-UI-btn KOslider-UI-btn--next ' + _.options.customNextClass + '" data-fn="next">Next</button>';
			}

			html += '</div></div>';

			if (_.options.uiPosition == 'above') {
				_.el.prepend(html);
			} if (_.options.uiPosition == 'below') {
				_.el.append(html);
			}
			_.el.find('.KOslider-UI-dot').eq(0).addClass('is-active');
		};


		/**
		 * If keys === true, use right and left keys to navigate between slides
		 */
		_.keypresses = function() {
			$(document).keydown(function(e) {
				var key = e.which;
				if (key == 37){
					_.prev(); // Left
				} else if (key == 39){
					_.next(); // Right
				}
			});
		};


		/**
		 * If dotsClick === true, allow the dots to be clicked
		 */
		_.dotsClick = function() {
			_.el.on('click', '.KOslider-UI-dot', function(event) {
				event.preventDefault();
				var target = $(this).index();
				if (_.options.debug) { console.log('target', target); }
				_.goto(target);
			});
		};

		/**
		 * If _.options.autoplay = true, slides will autplay
		 */
		_.autoplay = function() {
			if (_.options.debug) { console.log('KOslider :: Autoplay KOslider. Are you sure you want this??'); }

			function interval() {
				var nextPos = _.index < _.count ? _.index + 1 : 0;
				_.goto(nextPos);
			}

			var auto = window.setInterval(interval, _.options.autoplayInterval);

			_.el.on({
				mouseover: function() {
					window.clearInterval(auto);
					auto = null;
				},
				mouseout: function() {
					auto = window.setInterval(interval, _.options.autoplayInterval);
				}
			});
		};


		/**
		 * Swipe slides
		 * If _.options.swipe = true, slides will be swipeable
		 */
		_.swipe = function() {
			var _self                = _.swipe;
			var _initialised         = false;
			var _swipeStartPoint     = null;

			_self.swipeDistance      = null;
			_self.swipeMaxDrift      = null;

			/**
			 * Public method to destroy the swipe functionality
			 */
			function destroy() {
				_.slide.off('touchstart', touchStartHandler);
				_.slide.off('touchmove', touchMoveHandler);
				$(window).off('touchend', touchEndHandler);

				_initialised     = false;
				_swipeStartPoint = { x:0, y:0 };
				_self.swipeDistance      = null;
			}

			function touchStartHandler(event) {
				_.slide.off('touchstart', touchStartHandler);
				if (_.options.debug) { console.log('KOslider :: touchStartHandler event', event); }
				var touch = event.originalEvent.changedTouches[0];

				// store the start point of the touch.
				_swipeStartPoint.x = touch.pageX !== undefined ? touch.pageX : touch.clientX;
				_swipeStartPoint.y = touch.pageY !== undefined ? touch.pageY : touch.clientY;

				_.slide.on('touchmove', touchMoveHandler);
				$(window).on('touchend', touchEndHandler);
			}

			function touchMoveHandler(event) {
				var touch = event.originalEvent.touches[0];
				var posX  = touch.pageX !== undefined ? touch.pageX : touch.clientX;
				var posY  = touch.pageY !== undefined ? touch.pageY : touch.clientY;

				// stop processing the gesture if the swipe has drifted too much vertically.
				if (Math.abs(_swipeStartPoint.y - posY) > _self.swipeMaxDrift) {
					// remove event listeners to stop the potential for multiple swipes occuring.
					reset();

					// return to stop processing the swipe.
					return;
				}
				// check if the swipe moved enough from its start point to be considered a gesture.
				if (Math.abs(_swipeStartPoint.x - posX) >= _self.swipeDistance) {
					if (_.options.debug) { console.debug ("KOslider :: swipe occurred. pixels swiped:", Math.abs(_swipeStartPoint.x - posX)); }

					if (posX > _swipeStartPoint.x) {// right swipe occurred
						_.prev();
					} else { // left swipe occurred
						_.next();
					}

					// remove event listeners to stop the potential for multiple swipes occuring.
					reset();
				}
			}

			function touchEndHandler () {
				if (_.options.debug) { console.log('KOslider :: touchEndHandler event', event); }
				// remove event listeners to stop the potential for multiple swipes occuring.
				reset();
			}

			function reset() {
				// return if the destroy method was called, rather than adding unwanted listeners.
				if (!_initialised) {
					return;
				}
				_.slide.off('touchmove', touchMoveHandler);
				$(window).off('touchend', touchEndHandler);
				_.slide.on('touchstart', touchStartHandler);
			}

			/**
			 * Initialise the swipe method
			 * @param  {integer} swipeDistance The distance moved before a swipe is triggered
			 * @param  {integer} swipeMaxDrift The vertical distance allowable before the swipe is cancelled
			 */
			function init(swipeDistance, swipeMaxDrift) {
				if (_initialised) {
					return;
				}

				_initialised     = true;
				_swipeStartPoint = { x:0, y:0 };
				_self.swipeDistance      = swipeDistance;
				_self.swipeMaxDrift      = swipeMaxDrift;

				_.slide.on('touchstart', touchStartHandler);
			}

			// Initialise the swipe
			init(100, 40);
		};
	};

	//  Create a jQuery plugin
	$.fn.KOslider = function() {
		var len = this.length;

		//  Enable multiple-slider support
		return this.each(function(index) {
			//  Cache a copy of $(this), so it
			var me       = $(this),
				key      = 'KOslider' + (len > 1 ? '-' + ++index : ''),
				options  = me.data('koslider'),
				instance = (new KOslider).init(me, options)
			;

			//  Invoke an KOslider instance
			me.data(key, instance).data('key', key);
		});
	};

	$('[data-koslider]').KOslider();

	KOslider.version = "0.5.0";
})(jQuery, false);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbWl0LWRlYm91bmNlLmpzIiwianF1ZXJ5LUtPc2xpZGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJqcXVlcnktS09zbGlkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIGRlYm91bmNlXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG1pbGxpc2Vjb25kcyBUaGlzIHBhcmFtIGluZGljYXRlcyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kc1xuICogICAgIHRvIHdhaXQgYWZ0ZXIgdGhlIGxhc3QgY2FsbCBiZWZvcmUgY2FsbGluZyB0aGUgb3JpZ2luYWwgZnVuY3Rpb24gLlxuICogQHJldHVybiB7ZnVuY3Rpb259IFRoaXMgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2hlbiBjYWxsZWQgd2lsbCB3YWl0IHRoZVxuICogICAgIGluZGljYXRlZCBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGFmdGVyIHRoZSBsYXN0IGNhbGwgYmVmb3JlXG4gKiAgICAgY2FsbGluZyB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gKi9cbkZ1bmN0aW9uLnByb3RvdHlwZS5kZWJvdW5jZSA9IGZ1bmN0aW9uIChtaWxsaXNlY29uZHMpIHtcblx0dmFyIGJhc2VGdW5jdGlvbiA9IHRoaXMsXG5cdFx0dGltZXIgPSBudWxsLFxuXHRcdHdhaXQgPSBtaWxsaXNlY29uZHM7XG5cblx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRhcmdzID0gYXJndW1lbnRzO1xuXG5cdFx0ZnVuY3Rpb24gY29tcGxldGUoKSB7XG5cdFx0XHRiYXNlRnVuY3Rpb24uYXBwbHkoc2VsZiwgYXJncyk7XG5cdFx0XHR0aW1lciA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYgKHRpbWVyKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdH1cblxuXHRcdHRpbWVyID0gc2V0VGltZW91dChjb21wbGV0ZSwgd2FpdCk7XG5cdH07XG59O1xuIiwiLyoqXG4gKiBLT3NsaWRlciBieSBAbXJtYXJ0aW5lYXVcbiAqXG4gKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21ybWFydGluZWF1L0tPc2xpZGVyIGZvciBkb2N1bWVudGF0aW9uIGFuZCBkZW1vc1xuICovXG5cbihmdW5jdGlvbigkLCBmKSB7XG5cdHZhciBLT3NsaWRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vICBPYmplY3QgY2xvbmVcblx0XHR2YXIgXyA9IHRoaXM7XG5cblx0XHQvLyBTZXQgc29tZSBkZWZhdWx0IG9wdGlvbnNcblx0XHRfLm9wdGlvbnMgPSB7XG5cdFx0XHRrZXlzICAgICAgICAgICAgIDogZmFsc2UsXG5cdFx0XHRkb3RzICAgICAgICAgICAgIDogdHJ1ZSxcblx0XHRcdGRvdHNDbGljayAgICAgICAgOiBmYWxzZSxcblx0XHRcdGFycm93cyAgICAgICAgICAgOiB0cnVlLFxuXHRcdFx0c2xpZGVyRWwgICAgICAgICA6ICcuS09zbGlkZXInLFxuXHRcdFx0c2xpZGUgICAgICAgICAgICA6ICcuS09zbGlkZXItc2xpZGUnLFxuXHRcdFx0dWlQb3NpdGlvbiAgICAgICA6ICdiZWZvcmUnLFxuXHRcdFx0Y3VzdG9tUHJldkNsYXNzICA6ICdpY29uLWFycm93LXByZXZpb3VzJyxcblx0XHRcdGN1c3RvbU5leHRDbGFzcyAgOiAnaWNvbi1hcnJvdy1uZXh0Jyxcblx0XHRcdGRlYnVnICAgICAgICAgICAgOiBmYWxzZSxcblx0XHRcdHNldEhlaWdodCAgICAgICAgOiBcImF1dG9cIixcblx0XHRcdGF1dG9wbGF5ICAgICAgICAgOiBmYWxzZSxcblx0XHRcdGF1dG9wbGF5SW50ZXJ2YWwgOiA0MDAwLFxuXHRcdFx0c3dpcGUgICAgICAgICAgICA6IGZhbHNlLFxuXHRcdFx0aXRlbVdpZHRoICAgICAgICA6IHVuZGVmaW5lZCxcblx0XHRcdGluYWN0aXZlQ2xhc3MgICAgOiAnS09zbGlkZXItLWluYWN0aXZlJyxcblx0XHRcdGFjdGl2ZUNsYXNzICAgICAgOiAnS09zbGlkZXItLWFjdGl2ZScsXG5cdFx0XHRjYWxsYmFja3MgICAgICAgIDoge31cblx0XHR9O1xuXG5cdFx0Xy5pbml0ID0gZnVuY3Rpb24oZWwsIG9wdGlvbnMpIHtcblx0XHRcdC8vICBDaGVjayB3aGV0aGVyIHdlJ3JlIHBhc3NpbmcgYW55IG9wdGlvbnMgaW4gdG8gS09zbGlkZXJcblx0XHRcdF8ub3B0aW9ucyA9ICQuZXh0ZW5kKF8ub3B0aW9ucywgb3B0aW9ucyk7XG5cdFx0XHRfLmVsICAgICAgPSBlbDsgLy8gLktPc2xpZGVyQ29udGFpbmVyXG5cdFx0XHRfLnNsaWRlciAgPSBlbC5maW5kKF8ub3B0aW9ucy5zbGlkZXJFbCk7XG5cdFx0XHRfLnNsaWRlICAgPSBfLnNsaWRlci5maW5kKF8ub3B0aW9ucy5zbGlkZSk7XG5cdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OiBvcHRpb25zJywgXy5vcHRpb25zLCAnb3B0aW9ucycsIG9wdGlvbnMpOyB9XG5cblx0XHRcdC8vIElmIGZld2VyIHRoYW4gMiBjaGlsZHJlbiBkbyBub3Qgc2V0dXAgS09zbGlkZXJcblx0XHRcdGlmICggXy5zbGlkZS5sZW5ndGggPCAyKSB7XG5cdFx0XHRcdGVsLmFkZENsYXNzKF8ub3B0aW9ucy5pbmFjdGl2ZUNsYXNzKTtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogbm90IGVub3VnaCBlbGVtZW50cyB0byBtYWtlIGEgc2xpZGVyJywgb3B0aW9ucyk7IH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBlbC5hZGRDbGFzcyhfLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG5cdFx0XHQvLyAgQ2FjaGVkIHZhcnNcblx0XHRcdHZhciBvcHRpb25zID0gXy5vcHRpb25zO1xuXHRcdFx0dmFyIHNsaWRlICAgPSBfLnNsaWRlO1xuXHRcdFx0dmFyIGxlbiAgICAgPSBzbGlkZS5sZW5ndGg7XG5cblx0XHRcdC8vIFNldCB1cCBzb21lIG90aGVyIHZhcnNcblx0XHRcdF8ubGVmdE9mZnNldCA9IDA7XG5cdFx0XHRfLmluZGV4ICAgICAgPSAwOyAvLyBDdXJyZW50IGluZGV4XG5cdFx0XHRfLm1pbiAgICAgICAgPSAwO1xuXHRcdFx0Xy5jb3VudCAgICAgID0gbGVuIC0gMTtcblxuXHRcdFx0Ly8gUmVzaXplOiBDaGVjayBhbmQgY2hhbmdlIHNpemVzIGlmIG5lZWRlZFxuXHRcdFx0JCh3aW5kb3cpLnJlc2l6ZSgkLnByb3h5KF8uZ2V0V2lkdGguZGVib3VuY2UoNTAwKSwgdGhpcykpLnRyaWdnZXIoJ3Jlc2l6ZScpO1xuXG5cdFx0XHRfLmVsLm9uKCdjbGljaycsICcuS09zbGlkZXItVUktYnRuJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0dmFyIGZuID0gJCh0aGlzKS5kYXRhKCdmbicpOyAvLyBDaG9vc2UgbmV4dCBvciBwcmV2XG5cdFx0XHRcdF9bZm5dKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gIEtleXByZXNzZXNcblx0XHRcdGlmIChvcHRpb25zLmtleXMpIHsgXy5rZXlwcmVzc2VzKCk7IH1cblxuXHRcdFx0Ly8gQ2xpY2thYmxlIGRvdHNcblx0XHRcdGlmIChvcHRpb25zLmRvdHNDbGljaykgeyBfLmRvdHNDbGljaygpOyB9XG5cblx0XHRcdC8vIEF1dG9wbGF5XG5cdFx0XHRpZiAob3B0aW9ucy5hdXRvcGxheSkgeyBfLmF1dG9wbGF5KCk7IH1cblxuXHRcdFx0Ly8gQXV0b3BsYXlcblx0XHRcdGlmIChvcHRpb25zLnN3aXBlKSB7IF8uc3dpcGUoKTsgfVxuXG5cdFx0XHRyZXR1cm4gXztcblx0XHR9O1xuXG5cblx0XHQkLmZuLktPc2xpZGVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0XHRcdF8uc2xpZGVyLmNzcygnd2lkdGgnLCAnYXV0bycpLmRhdGEoe0tPc2xpZGVyOiB1bmRlZmluZWQsIGtleTogdW5kZWZpbmVkfSk7XG5cdFx0XHRfLnNsaWRlci5maW5kKCcuS09zbGlkZXItVUknKS5yZW1vdmUoKTtcblx0XHRcdF8uc2xpZGUuY3NzKCd3aWR0aCcsICdhdXRvJyk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogR28gdG8gc2xpZGVcblx0XHQgKiBAcmV0dXJuIHtpbnRlZ2VyfSBHbyB0byBzbGlkZVxuXHRcdCAqIFZhbHVlIHNob3VsZCBiZSB6ZXJvLWluZGV4ZWQgbnVtYmVyIGZvciBwYXJ0aWN1bGFyIGUuZy4gMCwgMSwgMiBldGNcblx0XHQgKi9cblx0XHRfLmdvdG8gPSBmdW5jdGlvbih4KSB7XG5cdFx0XHRpZiAoXy50b29UaGluKSB7XG5cdFx0XHRcdF8ubGVmdE9mZnNldCA9IDA7XG5cdFx0XHRcdF8ucmVhY2hlZEVuZCA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIGlmIChfLmxlZnRPZmZzZXQgPCBfLm1heCB8fCAtKHggKiBfLml0ZW1XaWR0aCkgPCBfLm1heCkge1xuXHRcdFx0XHRfLmxlZnRPZmZzZXQgPSBfLm1heDtcblx0XHRcdFx0Xy5yZWFjaGVkRW5kID0gdHJ1ZTtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogcmVhY2hlZEVuZCA9IHRydWUnKTsgfVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Xy5sZWZ0T2Zmc2V0ID0gLSh4ICogXy5pdGVtV2lkdGgpO1xuXHRcdFx0XHRfLnJlYWNoZWRFbmQgPSBmYWxzZTtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogcmVhY2hlZEVuZCA9IGZhbHNlJyk7IH1cblx0XHRcdH1cblxuXHRcdFx0Xy5pbmRleCA9IHg7XG5cblx0XHRcdF8uc2V0SGVpZ2h0KHgpO1xuXG5cdFx0XHRfLnNsaWRlci5jc3MoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGVYKCcgKyBfLmxlZnRPZmZzZXQgKyAncHgpJyk7XG5cblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0tPc2xpZGVyIDo6IF8uZ290bygpIDo6IFxcblxcdHgnLCB4LCAnXFxuXFx0bGVmdE9mZnNldDonLCBfLmxlZnRPZmZzZXQsICdcXG5cXHRpbmRleCcsIF8uaW5kZXgsICdcXG5cXHRpdGVtV2lkdGg6JywgXy5pdGVtV2lkdGgsICdcXG5cXHRtb3ZlIGFtb3VudDonLCBfLmxlZnRPZmZzZXQgLyBfLmluZGV4LCAnXFxuXFx0c2hvdWxkIG1vdmUgYW1vdW50OicsIF8uaXRlbVdpZHRoKTtcblx0XHRcdH1cblxuXHRcdFx0Xy5uYXZTdGF0ZSgpO1xuXG5cdFx0XHRpZiAoXy5vcHRpb25zLmNhbGxiYWNrcy5vbkNoYW5nZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGV2YWwoXy5vcHRpb25zLmNhbGxiYWNrcy5vbkNoYW5nZSk7XG5cdFx0XHR9XG5cdFx0XHQvL18udHJhY2tpbmcoKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogTW92ZSB0byBuZXh0IGl0ZW1cblx0XHQgKi9cblx0XHRfLm5leHQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtb3ZlVG87XG5cdFx0XHRpZiAoXy5pbmRleCA8IF8uY291bnQpIHtcblx0XHRcdFx0bW92ZVRvID0gXy5pbmRleCArIDE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb3ZlVG8gPSBfLmNvdW50O1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OiBuZXh0KCkgOjogXFxuXFx0Xy5pbmRleCcsIF8uaW5kZXgsICdcXG5cXHRtb3ZlIHRvOicsIF8ubGVmdE9mZnNldCAtIF8uaXRlbVdpZHRoLCAnXFxuXFx0bW92ZVRvJywgbW92ZVRvKTtcblx0XHRcdH1cblxuXHRcdFx0Xy5nb3RvKG1vdmVUbyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIE1vdmUgdG8gcHJldmlvdXMgaXRlbVxuXHRcdCAqL1xuXHRcdF8ucHJldiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1vdmVUbztcblx0XHRcdGlmIChfLmluZGV4ID4gMCkge1xuXHRcdFx0XHRtb3ZlVG8gPSBfLmluZGV4IC0gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1vdmVUbyA9IDA7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0tPc2xpZGVyIDo6IHByZXYoKSA6OiBcXG5cXHRfLmluZGV4JywgXy5pbmRleCwgJ1xcblxcdG1vdmUgdG86JywgXy5sZWZ0T2Zmc2V0ICsgXy5pdGVtV2lkdGgsICdcXG5cXHRtb3ZlVG8nLCBtb3ZlVG8pO1xuXHRcdFx0fVxuXG5cdFx0XHRfLmdvdG8obW92ZVRvKTtcblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBDaGFuZ2UgbmF2IHN0YXRlXG5cdFx0ICovXG5cdFx0Xy5uYXZTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGF0U3RhcnQ7XG5cdFx0XHR2YXIgYXRFbmQ7XG5cblx0XHRcdC8vIEVuYWJsZS9EaXNhYmxlIHRoZSBwcmV2IGJ0blxuXHRcdFx0aWYgKF8uaW5kZXggPT09IDApIHtcblx0XHRcdFx0YXRTdGFydCA9IHRydWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhdFN0YXJ0ID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEVuYWJsZS9EaXNhYmxlIHRoZSBuZXh0IGJ0bi5cblx0XHRcdGlmIChfLmluZGV4ID09PSBfLmNvdW50IHx8IF8ucmVhY2hlZEVuZCkge1xuXHRcdFx0XHRhdEVuZCA9IHRydWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhdEVuZCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRfLmVsLmZpbmQoJy5LT3NsaWRlci1VSS1idG4tLXByZXZpb3VzJykucHJvcCgnZGlzYWJsZWQnLCBhdFN0YXJ0KTtcblx0XHRcdF8uZWwuZmluZCgnLktPc2xpZGVyLVVJLWJ0bi0tbmV4dCcpLnByb3AoJ2Rpc2FibGVkJywgYXRFbmQpO1xuXG5cdFx0XHQvLyBTZXQgZmlyc3QgZG90IHRvIGJlIGFjdGl2ZVxuXHRcdFx0Xy5lbC5maW5kKCcuS09zbGlkZXItVUktZG90JykuZXEoXy5pbmRleCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLnNpYmxpbmdzKCkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBHZXQgc2l6ZSBvZiAuc2xpZGVyIGFuZCB0aGVuIHJ1biBfLnNldFNpemVzKClcblx0XHQgKi9cblx0XHRfLmdldFdpZHRoID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRfLml0ZW1XaWR0aCA9IHBhcnNlSW50KF8ub3B0aW9ucy5pdGVtV2lkdGgpID4gMCA/IHBhcnNlSW50KF8ub3B0aW9ucy5pdGVtV2lkdGgpIDogXy5lbC53aWR0aCgpO1xuXHRcdFx0Xy5zZXRTaXplKF8uaXRlbVdpZHRoKTtcblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBTZXQgc2l6ZXMgZm9yIGVsZW1lbnRcblx0XHQgKi9cblx0XHRfLnNldFNpemUgPSBmdW5jdGlvbihpdGVtV2lkdGgpIHtcblx0XHRcdHZhciAkY29udGFpbmVyV2lkdGggPSBfLmVsLndpZHRoKCk7ICAgICAgICAgICAgICAgLy8gQ29udGFpbmVyIHdpZHRoXG5cdFx0XHR2YXIgJHNsaWRlcldpZHRoICAgID0gXy5zbGlkZS5sZW5ndGggKiBpdGVtV2lkdGg7IC8vIGZ1bGwgd2lkdGggb2Ygc2xpZGVyIHdpdGggYWxsIGl0ZW1zIGZsb2F0ZWRcblx0XHRcdF8ubWF4ICAgICAgICAgICAgICAgPSBNYXRoLnJvdW5kKC0oJHNsaWRlcldpZHRoIC0gJGNvbnRhaW5lcldpZHRoKSk7XG5cdFx0XHRfLmxlZnRPZmZzZXQgICAgICAgID0gLShpdGVtV2lkdGggKiBfLmluZGV4KTtcblxuXHRcdFx0Xy5zbGlkZXIuY3NzKHtcblx0XHRcdFx0d2lkdGggICAgOiBNYXRoLnJvdW5kKCRzbGlkZXJXaWR0aCksXG5cdFx0XHRcdHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVgoJyArIF8ubGVmdE9mZnNldCArICdweCknXG5cdFx0XHR9KTtcblx0XHRcdF8uc2xpZGUuY3NzKHsgd2lkdGg6IGl0ZW1XaWR0aCB9KTtcblxuXHRcdFx0Xy5zZXRIZWlnaHQoXy5pbmRleCk7XG5cblx0XHRcdC8vIENyZWF0ZSBVSSBpZiB0aGVyZSBpcyBlbm91Z2ggc3BhY2UgdG8gZG8gc29cblx0XHRcdGlmICgkc2xpZGVyV2lkdGggPiAkY29udGFpbmVyV2lkdGgpIHtcblx0XHRcdFx0Ly8gQ3JlYXRlIFVJIC0gRG90cyBhbmQgbmV4dC9wcmV2IGJ1dHRvbnNcblx0XHRcdFx0aWYgKF8uZWwuZmluZCgnLktPc2xpZGVyLVVJJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Xy5jcmVhdGVVSSgpO1xuXHRcdFx0XHRcdF8udG9vVGhpbiA9IGZhbHNlO1xuXHRcdFx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ0NyZWF0ZSBVSScpOyB9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdF8uZWwuZmluZCgnLktPc2xpZGVyLVVJJykucmVtb3ZlKCk7XG5cdFx0XHRcdF8udG9vVGhpbiA9IHRydWU7XG5cdFx0XHRcdGlmIChfLmxlZnRPZmZzZXQgIT09IDApIHtcblx0XHRcdFx0XHRfLmxlZnRPZmZzZXQgPSAwO1xuXHRcdFx0XHRcdF8uZ290bygwKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdyZW1vdmUgdGhlIFVJJyk7IH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1Zykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnS09zbGlkZXIgOjogXy5zZXRTaXplKCkgOjogXFxuXFx0Xy5tYXg6JywgXy5tYXggLCAnXFxuXFx0Xy5taW46JywgXy5taW4sICdcXG5cXHRsZWZ0T2Zmc2V0OicsIF8ubGVmdE9mZnNldCwgJ1xcblxcdGluZGV4JywgXy5pbmRleCwgJ1xcblxcdGl0ZW1XaWR0aDonLCBfLml0ZW1XaWR0aCwgJ1xcblxcdF8uc2xpZGUubGVuZ3RoJywgXy5zbGlkZS5sZW5ndGgsICdcXG5cXHQkc2xpZGVyV2lkdGgnLCAkc2xpZGVyV2lkdGgsICdcXG5cXHRfLmVsLndpZHRoKCknLCBfLmVsLndpZHRoKCksICdfLmVsLmZpbmQoXFwnLktPc2xpZGVyXFwnKS53aWR0aCgpXFwnKScsIF8uZWwuZmluZCgnLktPc2xpZGVyJykud2lkdGgoKSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogU2V0IGhlaWdodCBvZiA8dWw+IGJhc2VkIG9uIGhlaWdodENoYW5nZSBvcHRpb25cblx0XHQgKi9cblx0XHRfLnNldEhlaWdodCA9IGZ1bmN0aW9uKGVxKSB7XG5cdFx0XHRcdGlmIChfLm9wdGlvbnMuc2V0SGVpZ2h0ID09IFwiYXV0b1wiKSB7XG5cdFx0XHRcdFx0dmFyIG5ld0hlaWdodCA9IF8uc2xpZGUuZXEoZXEpLmhlaWdodCgpO1xuXHRcdFx0XHRcdF8uc2xpZGVyLmhlaWdodChuZXdIZWlnaHQpO1xuXHRcdFx0XHR9IGVsc2UgaWYoXy5vcHRpb25zLnNldEhlaWdodCA9PSBcImVxdWFsXCIpIHtcblx0XHRcdFx0XHRfLmVxdWFsaXplSGVpZ2h0cygpO1xuXHRcdFx0XHR9XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogRXF1YWxpc2UgSGVpZ2h0cyBfLmVxdWFsaXplSGVpZ2h0cygpXG5cdFx0ICovXG5cdFx0Xy5lcXVhbGl6ZUhlaWdodHMgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ0VxdWFsIHRydWUnKTsgfVxuXHRcdFx0dmFyIGhpZ2hlc3RCb3ggPSAwO1xuXHRcdFx0dmFyICRlcXVhbGlzZUVsID0gXy5vcHRpb25zLmVxdWFsaXNlRWw7XG5cblx0XHRcdF8uc2xpZGVyLmZpbmQoJGVxdWFsaXNlRWwpLmVhY2goZnVuY3Rpb24oKXtcblx0XHRcdFx0JCh0aGlzKS5yZW1vdmVBdHRyKCdzdHlsZScpO1xuXG5cdFx0XHRcdGlmKCAkKHRoaXMpLmhlaWdodCgpID4gaGlnaGVzdEJveCApIHtcblx0XHRcdFx0XHRoaWdoZXN0Qm94ID0gJCh0aGlzKS5oZWlnaHQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRfLnNsaWRlci5maW5kKCRlcXVhbGlzZUVsKS5jc3MoJ2hlaWdodCcsIGhpZ2hlc3RCb3gpO1xuXHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogXy5lcXVhbGl6ZUhlaWdodHMoKSA6OiBcXG5cXHRoaWdoZXN0Qm94OicsIGhpZ2hlc3RCb3gpOyB9XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlIHRoZSBVSVxuXHRcdCAqIERvdHMgOiB3aWxsIHNob3cgaWYgZG90cyA9IHRydWVcblx0XHQgKiBBcnJvd3MgOiB3aWxsIHNob3cgaWYgYXJyb3dzID0gdHJ1ZVxuXHRcdCAqL1xuXHRcdF8uY3JlYXRlVUkgPSBmdW5jdGlvbigpIHtcblx0XHRcdGh0bWwgPSAnPGRpdiBjbGFzcz1cIktPc2xpZGVyLVVJIEtPc2xpZGVyLVVJLS0nICsgXy5vcHRpb25zLnVpUG9zaXRpb24gKyAnIGNsZWFyZml4XCI+PGRpdiBjbGFzcz1cIktPc2xpZGVyLVVJLXBhZ2Vyc1wiPic7XG5cblx0XHRcdGlmIChfLm9wdGlvbnMuYXJyb3dzKSB7XG5cdFx0XHRcdGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJLT3NsaWRlci1VSS1idG4gS09zbGlkZXItVUktYnRuLS1wcmV2aW91cyAnICsgXy5vcHRpb25zLmN1c3RvbVByZXZDbGFzcyArICdcIiBkYXRhLWZuPVwicHJldlwiIGRpc2FibGVkPlByZXZpb3VzPC9idXR0b24+Jztcblx0XHRcdH1cblxuXHRcdFx0aWYgKF8ub3B0aW9ucy5kb3RzKSB7XG5cdFx0XHRcdGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJLT3NsaWRlci1VSS1kb3RzXCI+Jztcblx0XHRcdFx0JC5lYWNoKF8uc2xpZGUsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGh0bWwgKz0gJzxzcGFuIGNsYXNzPVwiS09zbGlkZXItVUktZG90XCI+PC9zcGFuPic7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoXy5vcHRpb25zLmFycm93cykge1xuXHRcdFx0XHRodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiS09zbGlkZXItVUktYnRuIEtPc2xpZGVyLVVJLWJ0bi0tbmV4dCAnICsgXy5vcHRpb25zLmN1c3RvbU5leHRDbGFzcyArICdcIiBkYXRhLWZuPVwibmV4dFwiPk5leHQ8L2J1dHRvbj4nO1xuXHRcdFx0fVxuXG5cdFx0XHRodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuXG5cdFx0XHRpZiAoXy5vcHRpb25zLnVpUG9zaXRpb24gPT0gJ2Fib3ZlJykge1xuXHRcdFx0XHRfLmVsLnByZXBlbmQoaHRtbCk7XG5cdFx0XHR9IGlmIChfLm9wdGlvbnMudWlQb3NpdGlvbiA9PSAnYmVsb3cnKSB7XG5cdFx0XHRcdF8uZWwuYXBwZW5kKGh0bWwpO1xuXHRcdFx0fVxuXHRcdFx0Xy5lbC5maW5kKCcuS09zbGlkZXItVUktZG90JykuZXEoMCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIElmIGtleXMgPT09IHRydWUsIHVzZSByaWdodCBhbmQgbGVmdCBrZXlzIHRvIG5hdmlnYXRlIGJldHdlZW4gc2xpZGVzXG5cdFx0ICovXG5cdFx0Xy5rZXlwcmVzc2VzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQkKGRvY3VtZW50KS5rZXlkb3duKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIGtleSA9IGUud2hpY2g7XG5cdFx0XHRcdGlmIChrZXkgPT0gMzcpe1xuXHRcdFx0XHRcdF8ucHJldigpOyAvLyBMZWZ0XG5cdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09IDM5KXtcblx0XHRcdFx0XHRfLm5leHQoKTsgLy8gUmlnaHRcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogSWYgZG90c0NsaWNrID09PSB0cnVlLCBhbGxvdyB0aGUgZG90cyB0byBiZSBjbGlja2VkXG5cdFx0ICovXG5cdFx0Xy5kb3RzQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0XHRcdF8uZWwub24oJ2NsaWNrJywgJy5LT3NsaWRlci1VSS1kb3QnLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzKS5pbmRleCgpO1xuXHRcdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCd0YXJnZXQnLCB0YXJnZXQpOyB9XG5cdFx0XHRcdF8uZ290byh0YXJnZXQpO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIElmIF8ub3B0aW9ucy5hdXRvcGxheSA9IHRydWUsIHNsaWRlcyB3aWxsIGF1dHBsYXlcblx0XHQgKi9cblx0XHRfLmF1dG9wbGF5ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OiBBdXRvcGxheSBLT3NsaWRlci4gQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRoaXM/PycpOyB9XG5cblx0XHRcdGZ1bmN0aW9uIGludGVydmFsKCkge1xuXHRcdFx0XHR2YXIgbmV4dFBvcyA9IF8uaW5kZXggPCBfLmNvdW50ID8gXy5pbmRleCArIDEgOiAwO1xuXHRcdFx0XHRfLmdvdG8obmV4dFBvcyk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBhdXRvID0gd2luZG93LnNldEludGVydmFsKGludGVydmFsLCBfLm9wdGlvbnMuYXV0b3BsYXlJbnRlcnZhbCk7XG5cblx0XHRcdF8uZWwub24oe1xuXHRcdFx0XHRtb3VzZW92ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHdpbmRvdy5jbGVhckludGVydmFsKGF1dG8pO1xuXHRcdFx0XHRcdGF1dG8gPSBudWxsO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRtb3VzZW91dDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0YXV0byA9IHdpbmRvdy5zZXRJbnRlcnZhbChpbnRlcnZhbCwgXy5vcHRpb25zLmF1dG9wbGF5SW50ZXJ2YWwpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBTd2lwZSBzbGlkZXNcblx0XHQgKiBJZiBfLm9wdGlvbnMuc3dpcGUgPSB0cnVlLCBzbGlkZXMgd2lsbCBiZSBzd2lwZWFibGVcblx0XHQgKi9cblx0XHRfLnN3aXBlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgX3NlbGYgICAgICAgICAgICAgICAgPSBfLnN3aXBlO1xuXHRcdFx0dmFyIF9pbml0aWFsaXNlZCAgICAgICAgID0gZmFsc2U7XG5cdFx0XHR2YXIgX3N3aXBlU3RhcnRQb2ludCAgICAgPSBudWxsO1xuXG5cdFx0XHRfc2VsZi5zd2lwZURpc3RhbmNlICAgICAgPSBudWxsO1xuXHRcdFx0X3NlbGYuc3dpcGVNYXhEcmlmdCAgICAgID0gbnVsbDtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBQdWJsaWMgbWV0aG9kIHRvIGRlc3Ryb3kgdGhlIHN3aXBlIGZ1bmN0aW9uYWxpdHlcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gZGVzdHJveSgpIHtcblx0XHRcdFx0Xy5zbGlkZS5vZmYoJ3RvdWNoc3RhcnQnLCB0b3VjaFN0YXJ0SGFuZGxlcik7XG5cdFx0XHRcdF8uc2xpZGUub2ZmKCd0b3VjaG1vdmUnLCB0b3VjaE1vdmVIYW5kbGVyKTtcblx0XHRcdFx0JCh3aW5kb3cpLm9mZigndG91Y2hlbmQnLCB0b3VjaEVuZEhhbmRsZXIpO1xuXG5cdFx0XHRcdF9pbml0aWFsaXNlZCAgICAgPSBmYWxzZTtcblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludCA9IHsgeDowLCB5OjAgfTtcblx0XHRcdFx0X3NlbGYuc3dpcGVEaXN0YW5jZSAgICAgID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gdG91Y2hTdGFydEhhbmRsZXIoZXZlbnQpIHtcblx0XHRcdFx0Xy5zbGlkZS5vZmYoJ3RvdWNoc3RhcnQnLCB0b3VjaFN0YXJ0SGFuZGxlcik7XG5cdFx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ0tPc2xpZGVyIDo6IHRvdWNoU3RhcnRIYW5kbGVyIGV2ZW50JywgZXZlbnQpOyB9XG5cdFx0XHRcdHZhciB0b3VjaCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQuY2hhbmdlZFRvdWNoZXNbMF07XG5cblx0XHRcdFx0Ly8gc3RvcmUgdGhlIHN0YXJ0IHBvaW50IG9mIHRoZSB0b3VjaC5cblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludC54ID0gdG91Y2gucGFnZVggIT09IHVuZGVmaW5lZCA/IHRvdWNoLnBhZ2VYIDogdG91Y2guY2xpZW50WDtcblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludC55ID0gdG91Y2gucGFnZVkgIT09IHVuZGVmaW5lZCA/IHRvdWNoLnBhZ2VZIDogdG91Y2guY2xpZW50WTtcblxuXHRcdFx0XHRfLnNsaWRlLm9uKCd0b3VjaG1vdmUnLCB0b3VjaE1vdmVIYW5kbGVyKTtcblx0XHRcdFx0JCh3aW5kb3cpLm9uKCd0b3VjaGVuZCcsIHRvdWNoRW5kSGFuZGxlcik7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIHRvdWNoTW92ZUhhbmRsZXIoZXZlbnQpIHtcblx0XHRcdFx0dmFyIHRvdWNoID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdO1xuXHRcdFx0XHR2YXIgcG9zWCAgPSB0b3VjaC5wYWdlWCAhPT0gdW5kZWZpbmVkID8gdG91Y2gucGFnZVggOiB0b3VjaC5jbGllbnRYO1xuXHRcdFx0XHR2YXIgcG9zWSAgPSB0b3VjaC5wYWdlWSAhPT0gdW5kZWZpbmVkID8gdG91Y2gucGFnZVkgOiB0b3VjaC5jbGllbnRZO1xuXG5cdFx0XHRcdC8vIHN0b3AgcHJvY2Vzc2luZyB0aGUgZ2VzdHVyZSBpZiB0aGUgc3dpcGUgaGFzIGRyaWZ0ZWQgdG9vIG11Y2ggdmVydGljYWxseS5cblx0XHRcdFx0aWYgKE1hdGguYWJzKF9zd2lwZVN0YXJ0UG9pbnQueSAtIHBvc1kpID4gX3NlbGYuc3dpcGVNYXhEcmlmdCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgdG8gc3RvcCB0aGUgcG90ZW50aWFsIGZvciBtdWx0aXBsZSBzd2lwZXMgb2NjdXJpbmcuXG5cdFx0XHRcdFx0cmVzZXQoKTtcblxuXHRcdFx0XHRcdC8vIHJldHVybiB0byBzdG9wIHByb2Nlc3NpbmcgdGhlIHN3aXBlLlxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBjaGVjayBpZiB0aGUgc3dpcGUgbW92ZWQgZW5vdWdoIGZyb20gaXRzIHN0YXJ0IHBvaW50IHRvIGJlIGNvbnNpZGVyZWQgYSBnZXN0dXJlLlxuXHRcdFx0XHRpZiAoTWF0aC5hYnMoX3N3aXBlU3RhcnRQb2ludC54IC0gcG9zWCkgPj0gX3NlbGYuc3dpcGVEaXN0YW5jZSkge1xuXHRcdFx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5kZWJ1ZyAoXCJLT3NsaWRlciA6OiBzd2lwZSBvY2N1cnJlZC4gcGl4ZWxzIHN3aXBlZDpcIiwgTWF0aC5hYnMoX3N3aXBlU3RhcnRQb2ludC54IC0gcG9zWCkpOyB9XG5cblx0XHRcdFx0XHRpZiAocG9zWCA+IF9zd2lwZVN0YXJ0UG9pbnQueCkgey8vIHJpZ2h0IHN3aXBlIG9jY3VycmVkXG5cdFx0XHRcdFx0XHRfLnByZXYoKTtcblx0XHRcdFx0XHR9IGVsc2UgeyAvLyBsZWZ0IHN3aXBlIG9jY3VycmVkXG5cdFx0XHRcdFx0XHRfLm5leHQoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyByZW1vdmUgZXZlbnQgbGlzdGVuZXJzIHRvIHN0b3AgdGhlIHBvdGVudGlhbCBmb3IgbXVsdGlwbGUgc3dpcGVzIG9jY3VyaW5nLlxuXHRcdFx0XHRcdHJlc2V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gdG91Y2hFbmRIYW5kbGVyICgpIHtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogdG91Y2hFbmRIYW5kbGVyIGV2ZW50JywgZXZlbnQpOyB9XG5cdFx0XHRcdC8vIHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgdG8gc3RvcCB0aGUgcG90ZW50aWFsIGZvciBtdWx0aXBsZSBzd2lwZXMgb2NjdXJpbmcuXG5cdFx0XHRcdHJlc2V0KCk7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIHJlc2V0KCkge1xuXHRcdFx0XHQvLyByZXR1cm4gaWYgdGhlIGRlc3Ryb3kgbWV0aG9kIHdhcyBjYWxsZWQsIHJhdGhlciB0aGFuIGFkZGluZyB1bndhbnRlZCBsaXN0ZW5lcnMuXG5cdFx0XHRcdGlmICghX2luaXRpYWxpc2VkKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF8uc2xpZGUub2ZmKCd0b3VjaG1vdmUnLCB0b3VjaE1vdmVIYW5kbGVyKTtcblx0XHRcdFx0JCh3aW5kb3cpLm9mZigndG91Y2hlbmQnLCB0b3VjaEVuZEhhbmRsZXIpO1xuXHRcdFx0XHRfLnNsaWRlLm9uKCd0b3VjaHN0YXJ0JywgdG91Y2hTdGFydEhhbmRsZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEluaXRpYWxpc2UgdGhlIHN3aXBlIG1ldGhvZFxuXHRcdFx0ICogQHBhcmFtICB7aW50ZWdlcn0gc3dpcGVEaXN0YW5jZSBUaGUgZGlzdGFuY2UgbW92ZWQgYmVmb3JlIGEgc3dpcGUgaXMgdHJpZ2dlcmVkXG5cdFx0XHQgKiBAcGFyYW0gIHtpbnRlZ2VyfSBzd2lwZU1heERyaWZ0IFRoZSB2ZXJ0aWNhbCBkaXN0YW5jZSBhbGxvd2FibGUgYmVmb3JlIHRoZSBzd2lwZSBpcyBjYW5jZWxsZWRcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gaW5pdChzd2lwZURpc3RhbmNlLCBzd2lwZU1heERyaWZ0KSB7XG5cdFx0XHRcdGlmIChfaW5pdGlhbGlzZWQpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRfaW5pdGlhbGlzZWQgICAgID0gdHJ1ZTtcblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludCA9IHsgeDowLCB5OjAgfTtcblx0XHRcdFx0X3NlbGYuc3dpcGVEaXN0YW5jZSAgICAgID0gc3dpcGVEaXN0YW5jZTtcblx0XHRcdFx0X3NlbGYuc3dpcGVNYXhEcmlmdCAgICAgID0gc3dpcGVNYXhEcmlmdDtcblxuXHRcdFx0XHRfLnNsaWRlLm9uKCd0b3VjaHN0YXJ0JywgdG91Y2hTdGFydEhhbmRsZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbml0aWFsaXNlIHRoZSBzd2lwZVxuXHRcdFx0aW5pdCgxMDAsIDQwKTtcblx0XHR9O1xuXHR9O1xuXG5cdC8vICBDcmVhdGUgYSBqUXVlcnkgcGx1Z2luXG5cdCQuZm4uS09zbGlkZXIgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGVuID0gdGhpcy5sZW5ndGg7XG5cblx0XHQvLyAgRW5hYmxlIG11bHRpcGxlLXNsaWRlciBzdXBwb3J0XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0Ly8gIENhY2hlIGEgY29weSBvZiAkKHRoaXMpLCBzbyBpdFxuXHRcdFx0dmFyIG1lICAgICAgID0gJCh0aGlzKSxcblx0XHRcdFx0a2V5ICAgICAgPSAnS09zbGlkZXInICsgKGxlbiA+IDEgPyAnLScgKyArK2luZGV4IDogJycpLFxuXHRcdFx0XHRvcHRpb25zICA9IG1lLmRhdGEoJ2tvc2xpZGVyJyksXG5cdFx0XHRcdGluc3RhbmNlID0gKG5ldyBLT3NsaWRlcikuaW5pdChtZSwgb3B0aW9ucylcblx0XHRcdDtcblxuXHRcdFx0Ly8gIEludm9rZSBhbiBLT3NsaWRlciBpbnN0YW5jZVxuXHRcdFx0bWUuZGF0YShrZXksIGluc3RhbmNlKS5kYXRhKCdrZXknLCBrZXkpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdCQoJ1tkYXRhLWtvc2xpZGVyXScpLktPc2xpZGVyKCk7XG5cblx0S09zbGlkZXIudmVyc2lvbiA9IFwiMC41LjBcIjtcbn0pKGpRdWVyeSwgZmFsc2UpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9