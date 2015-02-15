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
			if (_.options.debug) { console.log('KOslider ::\n\tOptions:\n\t\t', _.options); }

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
			}

			_.index = x;

			_.setHeight(x);

			_.slider.css('transform', 'translateX(' + _.leftOffset + 'px)');

			if (_.options.debug) {
				console.log('KOslider ::\n\t_.goto() :: \n\t\tx', x, '\n\t\tleftOffset:', _.leftOffset, '\n\t\tindex', _.index, '\n\t\titemWidth:', _.itemWidth, '\n\t\tmove amount:', _.leftOffset / _.index);
			}

			_.navState();

			if (_.options.callbacks.onChange !== undefined) {
				eval(_.options.callbacks.onChange);
			}
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
				}
			} else {
				_.el.find('.KOslider-UI').remove();
				_.tooThin = true;
				if (_.leftOffset !== 0) {
					_.leftOffset = 0;
					_.goto(0);
				}
			}

			if (_.options.debug) {
				console.log('KOslider ::\n\t_.setSize() :: \n\t\t_.max:', _.max , '\n\t\t_.min:', _.min, '\n\t\tleftOffset:', _.leftOffset, '\n\t\tindex', _.index, '\n\t\titemWidth:', _.itemWidth, '\n\t\t_.slide.length', _.slide.length, '\n\t\t$sliderWidth', $sliderWidth);
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
			if (_.options.debug) { console.log('KOslider ::\n\t_.equalizeHeights() :: \n\t\thighestBox:', highestBox); }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbWl0LWRlYm91bmNlLmpzIiwianF1ZXJ5LUtPc2xpZGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoianF1ZXJ5LUtPc2xpZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBkZWJvdW5jZVxuICogQHBhcmFtIHtpbnRlZ2VyfSBtaWxsaXNlY29uZHMgVGhpcyBwYXJhbSBpbmRpY2F0ZXMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHNcbiAqICAgICB0byB3YWl0IGFmdGVyIHRoZSBsYXN0IGNhbGwgYmVmb3JlIGNhbGxpbmcgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIC5cbiAqIEByZXR1cm4ge2Z1bmN0aW9ufSBUaGlzIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdoZW4gY2FsbGVkIHdpbGwgd2FpdCB0aGVcbiAqICAgICBpbmRpY2F0ZWQgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBhZnRlciB0aGUgbGFzdCBjYWxsIGJlZm9yZVxuICogICAgIGNhbGxpbmcgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICovXG5GdW5jdGlvbi5wcm90b3R5cGUuZGVib3VuY2UgPSBmdW5jdGlvbiAobWlsbGlzZWNvbmRzKSB7XG5cdHZhciBiYXNlRnVuY3Rpb24gPSB0aGlzLFxuXHRcdHRpbWVyID0gbnVsbCxcblx0XHR3YWl0ID0gbWlsbGlzZWNvbmRzO1xuXG5cdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0YXJncyA9IGFyZ3VtZW50cztcblxuXHRcdGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuXHRcdFx0YmFzZUZ1bmN0aW9uLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXHRcdFx0dGltZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmICh0aW1lcikge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0XHR9XG5cblx0XHR0aW1lciA9IHNldFRpbWVvdXQoY29tcGxldGUsIHdhaXQpO1xuXHR9O1xufTtcbiIsIi8qKlxuICogS09zbGlkZXIgYnkgQG1ybWFydGluZWF1XG4gKlxuICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tcm1hcnRpbmVhdS9LT3NsaWRlciBmb3IgZG9jdW1lbnRhdGlvbiBhbmQgZGVtb3NcbiAqL1xuXG4oZnVuY3Rpb24oJCwgZikge1xuXHR2YXIgS09zbGlkZXIgPSBmdW5jdGlvbigpIHtcblx0XHQvLyAgT2JqZWN0IGNsb25lXG5cdFx0dmFyIF8gPSB0aGlzO1xuXG5cdFx0Ly8gU2V0IHNvbWUgZGVmYXVsdCBvcHRpb25zXG5cdFx0Xy5vcHRpb25zID0ge1xuXHRcdFx0a2V5cyAgICAgICAgICAgICA6IGZhbHNlLFxuXHRcdFx0ZG90cyAgICAgICAgICAgICA6IHRydWUsXG5cdFx0XHRkb3RzQ2xpY2sgICAgICAgIDogZmFsc2UsXG5cdFx0XHRhcnJvd3MgICAgICAgICAgIDogdHJ1ZSxcblx0XHRcdHNsaWRlckVsICAgICAgICAgOiAnLktPc2xpZGVyJyxcblx0XHRcdHNsaWRlICAgICAgICAgICAgOiAnLktPc2xpZGVyLXNsaWRlJyxcblx0XHRcdHVpUG9zaXRpb24gICAgICAgOiAnYmVmb3JlJyxcblx0XHRcdGN1c3RvbVByZXZDbGFzcyAgOiAnaWNvbi1hcnJvdy1wcmV2aW91cycsXG5cdFx0XHRjdXN0b21OZXh0Q2xhc3MgIDogJ2ljb24tYXJyb3ctbmV4dCcsXG5cdFx0XHRkZWJ1ZyAgICAgICAgICAgIDogZmFsc2UsXG5cdFx0XHRzZXRIZWlnaHQgICAgICAgIDogXCJhdXRvXCIsXG5cdFx0XHRhdXRvcGxheSAgICAgICAgIDogZmFsc2UsXG5cdFx0XHRhdXRvcGxheUludGVydmFsIDogNDAwMCxcblx0XHRcdHN3aXBlICAgICAgICAgICAgOiBmYWxzZSxcblx0XHRcdGl0ZW1XaWR0aCAgICAgICAgOiB1bmRlZmluZWQsXG5cdFx0XHRpbmFjdGl2ZUNsYXNzICAgIDogJ0tPc2xpZGVyLS1pbmFjdGl2ZScsXG5cdFx0XHRhY3RpdmVDbGFzcyAgICAgIDogJ0tPc2xpZGVyLS1hY3RpdmUnLFxuXHRcdFx0Y2FsbGJhY2tzICAgICAgICA6IHt9XG5cdFx0fTtcblxuXHRcdF8uaW5pdCA9IGZ1bmN0aW9uKGVsLCBvcHRpb25zKSB7XG5cdFx0XHQvLyAgQ2hlY2sgd2hldGhlciB3ZSdyZSBwYXNzaW5nIGFueSBvcHRpb25zIGluIHRvIEtPc2xpZGVyXG5cdFx0XHRfLm9wdGlvbnMgPSAkLmV4dGVuZChfLm9wdGlvbnMsIG9wdGlvbnMpO1xuXHRcdFx0Xy5lbCAgICAgID0gZWw7IC8vIC5LT3NsaWRlckNvbnRhaW5lclxuXHRcdFx0Xy5zbGlkZXIgID0gZWwuZmluZChfLm9wdGlvbnMuc2xpZGVyRWwpO1xuXHRcdFx0Xy5zbGlkZSAgID0gXy5zbGlkZXIuZmluZChfLm9wdGlvbnMuc2xpZGUpO1xuXHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjpcXG5cXHRPcHRpb25zOlxcblxcdFxcdCcsIF8ub3B0aW9ucyk7IH1cblxuXHRcdFx0Ly8gSWYgZmV3ZXIgdGhhbiAyIGNoaWxkcmVuIGRvIG5vdCBzZXR1cCBLT3NsaWRlclxuXHRcdFx0aWYgKCBfLnNsaWRlLmxlbmd0aCA8IDIpIHtcblx0XHRcdFx0ZWwuYWRkQ2xhc3MoXy5vcHRpb25zLmluYWN0aXZlQ2xhc3MpO1xuXHRcdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OiBub3QgZW5vdWdoIGVsZW1lbnRzIHRvIG1ha2UgYSBzbGlkZXInLCBvcHRpb25zKTsgfVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGVsLmFkZENsYXNzKF8ub3B0aW9ucy5hY3RpdmVDbGFzcyk7XG5cblx0XHRcdC8vICBDYWNoZWQgdmFyc1xuXHRcdFx0dmFyIG9wdGlvbnMgPSBfLm9wdGlvbnM7XG5cdFx0XHR2YXIgc2xpZGUgICA9IF8uc2xpZGU7XG5cdFx0XHR2YXIgbGVuICAgICA9IHNsaWRlLmxlbmd0aDtcblxuXHRcdFx0Ly8gU2V0IHVwIHNvbWUgb3RoZXIgdmFyc1xuXHRcdFx0Xy5sZWZ0T2Zmc2V0ID0gMDtcblx0XHRcdF8uaW5kZXggICAgICA9IDA7IC8vIEN1cnJlbnQgaW5kZXhcblx0XHRcdF8ubWluICAgICAgICA9IDA7XG5cdFx0XHRfLmNvdW50ICAgICAgPSBsZW4gLSAxO1xuXG5cdFx0XHQvLyBSZXNpemU6IENoZWNrIGFuZCBjaGFuZ2Ugc2l6ZXMgaWYgbmVlZGVkXG5cdFx0XHQkKHdpbmRvdykucmVzaXplKCQucHJveHkoXy5nZXRXaWR0aC5kZWJvdW5jZSg1MDApLCB0aGlzKSkudHJpZ2dlcigncmVzaXplJyk7XG5cblx0XHRcdF8uZWwub24oJ2NsaWNrJywgJy5LT3NsaWRlci1VSS1idG4nLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR2YXIgZm4gPSAkKHRoaXMpLmRhdGEoJ2ZuJyk7IC8vIENob29zZSBuZXh0IG9yIHByZXZcblx0XHRcdFx0X1tmbl0oKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyAgS2V5cHJlc3Nlc1xuXHRcdFx0aWYgKG9wdGlvbnMua2V5cykgeyBfLmtleXByZXNzZXMoKTsgfVxuXG5cdFx0XHQvLyBDbGlja2FibGUgZG90c1xuXHRcdFx0aWYgKG9wdGlvbnMuZG90c0NsaWNrKSB7IF8uZG90c0NsaWNrKCk7IH1cblxuXHRcdFx0Ly8gQXV0b3BsYXlcblx0XHRcdGlmIChvcHRpb25zLmF1dG9wbGF5KSB7IF8uYXV0b3BsYXkoKTsgfVxuXG5cdFx0XHQvLyBBdXRvcGxheVxuXHRcdFx0aWYgKG9wdGlvbnMuc3dpcGUpIHsgXy5zd2lwZSgpOyB9XG5cblx0XHRcdHJldHVybiBfO1xuXHRcdH07XG5cblxuXHRcdCQuZm4uS09zbGlkZXIuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Xy5zbGlkZXIuY3NzKCd3aWR0aCcsICdhdXRvJykuZGF0YSh7S09zbGlkZXI6IHVuZGVmaW5lZCwga2V5OiB1bmRlZmluZWR9KTtcblx0XHRcdF8uc2xpZGVyLmZpbmQoJy5LT3NsaWRlci1VSScpLnJlbW92ZSgpO1xuXHRcdFx0Xy5zbGlkZS5jc3MoJ3dpZHRoJywgJ2F1dG8nKTtcblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBHbyB0byBzbGlkZVxuXHRcdCAqIEByZXR1cm4ge2ludGVnZXJ9IEdvIHRvIHNsaWRlXG5cdFx0ICogVmFsdWUgc2hvdWxkIGJlIHplcm8taW5kZXhlZCBudW1iZXIgZm9yIHBhcnRpY3VsYXIgZS5nLiAwLCAxLCAyIGV0Y1xuXHRcdCAqL1xuXHRcdF8uZ290byA9IGZ1bmN0aW9uKHgpIHtcblx0XHRcdGlmIChfLnRvb1RoaW4pIHtcblx0XHRcdFx0Xy5sZWZ0T2Zmc2V0ID0gMDtcblx0XHRcdFx0Xy5yZWFjaGVkRW5kID0gZmFsc2U7XG5cdFx0XHR9IGVsc2UgaWYgKF8ubGVmdE9mZnNldCA8IF8ubWF4IHx8IC0oeCAqIF8uaXRlbVdpZHRoKSA8IF8ubWF4KSB7XG5cdFx0XHRcdF8ubGVmdE9mZnNldCA9IF8ubWF4O1xuXHRcdFx0XHRfLnJlYWNoZWRFbmQgPSB0cnVlO1xuXHRcdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OiByZWFjaGVkRW5kID0gdHJ1ZScpOyB9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRfLmxlZnRPZmZzZXQgPSAtKHggKiBfLml0ZW1XaWR0aCk7XG5cdFx0XHRcdF8ucmVhY2hlZEVuZCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRfLmluZGV4ID0geDtcblxuXHRcdFx0Xy5zZXRIZWlnaHQoeCk7XG5cblx0XHRcdF8uc2xpZGVyLmNzcygndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZVgoJyArIF8ubGVmdE9mZnNldCArICdweCknKTtcblxuXHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1Zykge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnS09zbGlkZXIgOjpcXG5cXHRfLmdvdG8oKSA6OiBcXG5cXHRcXHR4JywgeCwgJ1xcblxcdFxcdGxlZnRPZmZzZXQ6JywgXy5sZWZ0T2Zmc2V0LCAnXFxuXFx0XFx0aW5kZXgnLCBfLmluZGV4LCAnXFxuXFx0XFx0aXRlbVdpZHRoOicsIF8uaXRlbVdpZHRoLCAnXFxuXFx0XFx0bW92ZSBhbW91bnQ6JywgXy5sZWZ0T2Zmc2V0IC8gXy5pbmRleCk7XG5cdFx0XHR9XG5cblx0XHRcdF8ubmF2U3RhdGUoKTtcblxuXHRcdFx0aWYgKF8ub3B0aW9ucy5jYWxsYmFja3Mub25DaGFuZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRldmFsKF8ub3B0aW9ucy5jYWxsYmFja3Mub25DaGFuZ2UpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBNb3ZlIHRvIG5leHQgaXRlbVxuXHRcdCAqL1xuXHRcdF8ubmV4dCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1vdmVUbztcblx0XHRcdGlmIChfLmluZGV4IDwgXy5jb3VudCkge1xuXHRcdFx0XHRtb3ZlVG8gPSBfLmluZGV4ICsgMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1vdmVUbyA9IF8uY291bnQ7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Xy5nb3RvKG1vdmVUbyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIE1vdmUgdG8gcHJldmlvdXMgaXRlbVxuXHRcdCAqL1xuXHRcdF8ucHJldiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1vdmVUbztcblx0XHRcdGlmIChfLmluZGV4ID4gMCkge1xuXHRcdFx0XHRtb3ZlVG8gPSBfLmluZGV4IC0gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1vdmVUbyA9IDA7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Xy5nb3RvKG1vdmVUbyk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogQ2hhbmdlIG5hdiBzdGF0ZVxuXHRcdCAqL1xuXHRcdF8ubmF2U3RhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhdFN0YXJ0O1xuXHRcdFx0dmFyIGF0RW5kO1xuXG5cdFx0XHQvLyBFbmFibGUvRGlzYWJsZSB0aGUgcHJldiBidG5cblx0XHRcdGlmIChfLmluZGV4ID09PSAwKSB7XG5cdFx0XHRcdGF0U3RhcnQgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXRTdGFydCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBFbmFibGUvRGlzYWJsZSB0aGUgbmV4dCBidG4uXG5cdFx0XHRpZiAoXy5pbmRleCA9PT0gXy5jb3VudCB8fCBfLnJlYWNoZWRFbmQpIHtcblx0XHRcdFx0YXRFbmQgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXRFbmQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Xy5lbC5maW5kKCcuS09zbGlkZXItVUktYnRuLS1wcmV2aW91cycpLnByb3AoJ2Rpc2FibGVkJywgYXRTdGFydCk7XG5cdFx0XHRfLmVsLmZpbmQoJy5LT3NsaWRlci1VSS1idG4tLW5leHQnKS5wcm9wKCdkaXNhYmxlZCcsIGF0RW5kKTtcblxuXHRcdFx0Ly8gU2V0IGZpcnN0IGRvdCB0byBiZSBhY3RpdmVcblx0XHRcdF8uZWwuZmluZCgnLktPc2xpZGVyLVVJLWRvdCcpLmVxKF8uaW5kZXgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5zaWJsaW5ncygpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogR2V0IHNpemUgb2YgLnNsaWRlciBhbmQgdGhlbiBydW4gXy5zZXRTaXplcygpXG5cdFx0ICovXG5cdFx0Xy5nZXRXaWR0aCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Xy5pdGVtV2lkdGggPSBwYXJzZUludChfLm9wdGlvbnMuaXRlbVdpZHRoKSA+IDAgPyBwYXJzZUludChfLm9wdGlvbnMuaXRlbVdpZHRoKSA6IF8uZWwud2lkdGgoKTtcblx0XHRcdF8uc2V0U2l6ZShfLml0ZW1XaWR0aCk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogU2V0IHNpemVzIGZvciBlbGVtZW50XG5cdFx0ICovXG5cdFx0Xy5zZXRTaXplID0gZnVuY3Rpb24oaXRlbVdpZHRoKSB7XG5cdFx0XHR2YXIgJGNvbnRhaW5lcldpZHRoID0gXy5lbC53aWR0aCgpOyAgICAgICAgICAgICAgIC8vIENvbnRhaW5lciB3aWR0aFxuXHRcdFx0dmFyICRzbGlkZXJXaWR0aCAgICA9IF8uc2xpZGUubGVuZ3RoICogaXRlbVdpZHRoOyAvLyBmdWxsIHdpZHRoIG9mIHNsaWRlciB3aXRoIGFsbCBpdGVtcyBmbG9hdGVkXG5cdFx0XHRfLm1heCAgICAgICAgICAgICAgID0gTWF0aC5yb3VuZCgtKCRzbGlkZXJXaWR0aCAtICRjb250YWluZXJXaWR0aCkpO1xuXHRcdFx0Xy5sZWZ0T2Zmc2V0ICAgICAgICA9IC0oaXRlbVdpZHRoICogXy5pbmRleCk7XG5cblx0XHRcdF8uc2xpZGVyLmNzcyh7XG5cdFx0XHRcdHdpZHRoICAgIDogTWF0aC5yb3VuZCgkc2xpZGVyV2lkdGgpLFxuXHRcdFx0XHR0cmFuc2Zvcm06ICd0cmFuc2xhdGVYKCcgKyBfLmxlZnRPZmZzZXQgKyAncHgpJ1xuXHRcdFx0fSk7XG5cdFx0XHRfLnNsaWRlLmNzcyh7IHdpZHRoOiBpdGVtV2lkdGggfSk7XG5cblx0XHRcdF8uc2V0SGVpZ2h0KF8uaW5kZXgpO1xuXG5cdFx0XHQvLyBDcmVhdGUgVUkgaWYgdGhlcmUgaXMgZW5vdWdoIHNwYWNlIHRvIGRvIHNvXG5cdFx0XHRpZiAoJHNsaWRlcldpZHRoID4gJGNvbnRhaW5lcldpZHRoKSB7XG5cdFx0XHRcdC8vIENyZWF0ZSBVSSAtIERvdHMgYW5kIG5leHQvcHJldiBidXR0b25zXG5cdFx0XHRcdGlmIChfLmVsLmZpbmQoJy5LT3NsaWRlci1VSScpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdF8uY3JlYXRlVUkoKTtcblx0XHRcdFx0XHRfLnRvb1RoaW4gPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Xy5lbC5maW5kKCcuS09zbGlkZXItVUknKS5yZW1vdmUoKTtcblx0XHRcdFx0Xy50b29UaGluID0gdHJ1ZTtcblx0XHRcdFx0aWYgKF8ubGVmdE9mZnNldCAhPT0gMCkge1xuXHRcdFx0XHRcdF8ubGVmdE9mZnNldCA9IDA7XG5cdFx0XHRcdFx0Xy5nb3RvKDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0tPc2xpZGVyIDo6XFxuXFx0Xy5zZXRTaXplKCkgOjogXFxuXFx0XFx0Xy5tYXg6JywgXy5tYXggLCAnXFxuXFx0XFx0Xy5taW46JywgXy5taW4sICdcXG5cXHRcXHRsZWZ0T2Zmc2V0OicsIF8ubGVmdE9mZnNldCwgJ1xcblxcdFxcdGluZGV4JywgXy5pbmRleCwgJ1xcblxcdFxcdGl0ZW1XaWR0aDonLCBfLml0ZW1XaWR0aCwgJ1xcblxcdFxcdF8uc2xpZGUubGVuZ3RoJywgXy5zbGlkZS5sZW5ndGgsICdcXG5cXHRcXHQkc2xpZGVyV2lkdGgnLCAkc2xpZGVyV2lkdGgpO1xuXHRcdFx0fVxuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIFNldCBoZWlnaHQgb2YgPHVsPiBiYXNlZCBvbiBoZWlnaHRDaGFuZ2Ugb3B0aW9uXG5cdFx0ICovXG5cdFx0Xy5zZXRIZWlnaHQgPSBmdW5jdGlvbihlcSkge1xuXHRcdFx0XHRpZiAoXy5vcHRpb25zLnNldEhlaWdodCA9PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdHZhciBuZXdIZWlnaHQgPSBfLnNsaWRlLmVxKGVxKS5oZWlnaHQoKTtcblx0XHRcdFx0XHRfLnNsaWRlci5oZWlnaHQobmV3SGVpZ2h0KTtcblx0XHRcdFx0fSBlbHNlIGlmKF8ub3B0aW9ucy5zZXRIZWlnaHQgPT0gXCJlcXVhbFwiKSB7XG5cdFx0XHRcdFx0Xy5lcXVhbGl6ZUhlaWdodHMoKTtcblx0XHRcdFx0fVxuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIEVxdWFsaXNlIEhlaWdodHMgXy5lcXVhbGl6ZUhlaWdodHMoKVxuXHRcdCAqL1xuXHRcdF8uZXF1YWxpemVIZWlnaHRzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdFcXVhbCB0cnVlJyk7IH1cblx0XHRcdHZhciBoaWdoZXN0Qm94ID0gMDtcblx0XHRcdHZhciAkZXF1YWxpc2VFbCA9IF8ub3B0aW9ucy5lcXVhbGlzZUVsO1xuXG5cdFx0XHRfLnNsaWRlci5maW5kKCRlcXVhbGlzZUVsKS5lYWNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdCQodGhpcykucmVtb3ZlQXR0cignc3R5bGUnKTtcblxuXHRcdFx0XHRpZiggJCh0aGlzKS5oZWlnaHQoKSA+IGhpZ2hlc3RCb3ggKSB7XG5cdFx0XHRcdFx0aGlnaGVzdEJveCA9ICQodGhpcykuaGVpZ2h0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Xy5zbGlkZXIuZmluZCgkZXF1YWxpc2VFbCkuY3NzKCdoZWlnaHQnLCBoaWdoZXN0Qm94KTtcblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ0tPc2xpZGVyIDo6XFxuXFx0Xy5lcXVhbGl6ZUhlaWdodHMoKSA6OiBcXG5cXHRcXHRoaWdoZXN0Qm94OicsIGhpZ2hlc3RCb3gpOyB9XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlIHRoZSBVSVxuXHRcdCAqIERvdHMgOiB3aWxsIHNob3cgaWYgZG90cyA9IHRydWVcblx0XHQgKiBBcnJvd3MgOiB3aWxsIHNob3cgaWYgYXJyb3dzID0gdHJ1ZVxuXHRcdCAqL1xuXHRcdF8uY3JlYXRlVUkgPSBmdW5jdGlvbigpIHtcblx0XHRcdGh0bWwgPSAnPGRpdiBjbGFzcz1cIktPc2xpZGVyLVVJIEtPc2xpZGVyLVVJLS0nICsgXy5vcHRpb25zLnVpUG9zaXRpb24gKyAnIGNsZWFyZml4XCI+PGRpdiBjbGFzcz1cIktPc2xpZGVyLVVJLXBhZ2Vyc1wiPic7XG5cblx0XHRcdGlmIChfLm9wdGlvbnMuYXJyb3dzKSB7XG5cdFx0XHRcdGh0bWwgKz0gJzxidXR0b24gY2xhc3M9XCJLT3NsaWRlci1VSS1idG4gS09zbGlkZXItVUktYnRuLS1wcmV2aW91cyAnICsgXy5vcHRpb25zLmN1c3RvbVByZXZDbGFzcyArICdcIiBkYXRhLWZuPVwicHJldlwiIGRpc2FibGVkPlByZXZpb3VzPC9idXR0b24+Jztcblx0XHRcdH1cblxuXHRcdFx0aWYgKF8ub3B0aW9ucy5kb3RzKSB7XG5cdFx0XHRcdGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJLT3NsaWRlci1VSS1kb3RzXCI+Jztcblx0XHRcdFx0JC5lYWNoKF8uc2xpZGUsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGh0bWwgKz0gJzxzcGFuIGNsYXNzPVwiS09zbGlkZXItVUktZG90XCI+PC9zcGFuPic7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoXy5vcHRpb25zLmFycm93cykge1xuXHRcdFx0XHRodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiS09zbGlkZXItVUktYnRuIEtPc2xpZGVyLVVJLWJ0bi0tbmV4dCAnICsgXy5vcHRpb25zLmN1c3RvbU5leHRDbGFzcyArICdcIiBkYXRhLWZuPVwibmV4dFwiPk5leHQ8L2J1dHRvbj4nO1xuXHRcdFx0fVxuXG5cdFx0XHRodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuXG5cdFx0XHRpZiAoXy5vcHRpb25zLnVpUG9zaXRpb24gPT0gJ2Fib3ZlJykge1xuXHRcdFx0XHRfLmVsLnByZXBlbmQoaHRtbCk7XG5cdFx0XHR9IGlmIChfLm9wdGlvbnMudWlQb3NpdGlvbiA9PSAnYmVsb3cnKSB7XG5cdFx0XHRcdF8uZWwuYXBwZW5kKGh0bWwpO1xuXHRcdFx0fVxuXHRcdFx0Xy5lbC5maW5kKCcuS09zbGlkZXItVUktZG90JykuZXEoMCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIElmIGtleXMgPT09IHRydWUsIHVzZSByaWdodCBhbmQgbGVmdCBrZXlzIHRvIG5hdmlnYXRlIGJldHdlZW4gc2xpZGVzXG5cdFx0ICovXG5cdFx0Xy5rZXlwcmVzc2VzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQkKGRvY3VtZW50KS5rZXlkb3duKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIGtleSA9IGUud2hpY2g7XG5cdFx0XHRcdGlmIChrZXkgPT0gMzcpe1xuXHRcdFx0XHRcdF8ucHJldigpOyAvLyBMZWZ0XG5cdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09IDM5KXtcblx0XHRcdFx0XHRfLm5leHQoKTsgLy8gUmlnaHRcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogSWYgZG90c0NsaWNrID09PSB0cnVlLCBhbGxvdyB0aGUgZG90cyB0byBiZSBjbGlja2VkXG5cdFx0ICovXG5cdFx0Xy5kb3RzQ2xpY2sgPSBmdW5jdGlvbigpIHtcblx0XHRcdF8uZWwub24oJ2NsaWNrJywgJy5LT3NsaWRlci1VSS1kb3QnLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzKS5pbmRleCgpO1xuXHRcdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCd0YXJnZXQnLCB0YXJnZXQpOyB9XG5cdFx0XHRcdF8uZ290byh0YXJnZXQpO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIElmIF8ub3B0aW9ucy5hdXRvcGxheSA9IHRydWUsIHNsaWRlcyB3aWxsIGF1dHBsYXlcblx0XHQgKi9cblx0XHRfLmF1dG9wbGF5ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OiBBdXRvcGxheSBLT3NsaWRlci4gQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRoaXM/PycpOyB9XG5cblx0XHRcdGZ1bmN0aW9uIGludGVydmFsKCkge1xuXHRcdFx0XHR2YXIgbmV4dFBvcyA9IF8uaW5kZXggPCBfLmNvdW50ID8gXy5pbmRleCArIDEgOiAwO1xuXHRcdFx0XHRfLmdvdG8obmV4dFBvcyk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBhdXRvID0gd2luZG93LnNldEludGVydmFsKGludGVydmFsLCBfLm9wdGlvbnMuYXV0b3BsYXlJbnRlcnZhbCk7XG5cblx0XHRcdF8uZWwub24oe1xuXHRcdFx0XHRtb3VzZW92ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHdpbmRvdy5jbGVhckludGVydmFsKGF1dG8pO1xuXHRcdFx0XHRcdGF1dG8gPSBudWxsO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRtb3VzZW91dDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0YXV0byA9IHdpbmRvdy5zZXRJbnRlcnZhbChpbnRlcnZhbCwgXy5vcHRpb25zLmF1dG9wbGF5SW50ZXJ2YWwpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBTd2lwZSBzbGlkZXNcblx0XHQgKiBJZiBfLm9wdGlvbnMuc3dpcGUgPSB0cnVlLCBzbGlkZXMgd2lsbCBiZSBzd2lwZWFibGVcblx0XHQgKi9cblx0XHRfLnN3aXBlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgX3NlbGYgICAgICAgICAgICAgICAgPSBfLnN3aXBlO1xuXHRcdFx0dmFyIF9pbml0aWFsaXNlZCAgICAgICAgID0gZmFsc2U7XG5cdFx0XHR2YXIgX3N3aXBlU3RhcnRQb2ludCAgICAgPSBudWxsO1xuXG5cdFx0XHRfc2VsZi5zd2lwZURpc3RhbmNlICAgICAgPSBudWxsO1xuXHRcdFx0X3NlbGYuc3dpcGVNYXhEcmlmdCAgICAgID0gbnVsbDtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBQdWJsaWMgbWV0aG9kIHRvIGRlc3Ryb3kgdGhlIHN3aXBlIGZ1bmN0aW9uYWxpdHlcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gZGVzdHJveSgpIHtcblx0XHRcdFx0Xy5zbGlkZS5vZmYoJ3RvdWNoc3RhcnQnLCB0b3VjaFN0YXJ0SGFuZGxlcik7XG5cdFx0XHRcdF8uc2xpZGUub2ZmKCd0b3VjaG1vdmUnLCB0b3VjaE1vdmVIYW5kbGVyKTtcblx0XHRcdFx0JCh3aW5kb3cpLm9mZigndG91Y2hlbmQnLCB0b3VjaEVuZEhhbmRsZXIpO1xuXG5cdFx0XHRcdF9pbml0aWFsaXNlZCAgICAgPSBmYWxzZTtcblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludCA9IHsgeDowLCB5OjAgfTtcblx0XHRcdFx0X3NlbGYuc3dpcGVEaXN0YW5jZSAgICAgID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gdG91Y2hTdGFydEhhbmRsZXIoZXZlbnQpIHtcblx0XHRcdFx0Xy5zbGlkZS5vZmYoJ3RvdWNoc3RhcnQnLCB0b3VjaFN0YXJ0SGFuZGxlcik7XG5cdFx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ0tPc2xpZGVyIDo6IHRvdWNoU3RhcnRIYW5kbGVyIGV2ZW50JywgZXZlbnQpOyB9XG5cdFx0XHRcdHZhciB0b3VjaCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQuY2hhbmdlZFRvdWNoZXNbMF07XG5cblx0XHRcdFx0Ly8gc3RvcmUgdGhlIHN0YXJ0IHBvaW50IG9mIHRoZSB0b3VjaC5cblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludC54ID0gdG91Y2gucGFnZVggIT09IHVuZGVmaW5lZCA/IHRvdWNoLnBhZ2VYIDogdG91Y2guY2xpZW50WDtcblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludC55ID0gdG91Y2gucGFnZVkgIT09IHVuZGVmaW5lZCA/IHRvdWNoLnBhZ2VZIDogdG91Y2guY2xpZW50WTtcblxuXHRcdFx0XHRfLnNsaWRlLm9uKCd0b3VjaG1vdmUnLCB0b3VjaE1vdmVIYW5kbGVyKTtcblx0XHRcdFx0JCh3aW5kb3cpLm9uKCd0b3VjaGVuZCcsIHRvdWNoRW5kSGFuZGxlcik7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIHRvdWNoTW92ZUhhbmRsZXIoZXZlbnQpIHtcblx0XHRcdFx0dmFyIHRvdWNoID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdO1xuXHRcdFx0XHR2YXIgcG9zWCAgPSB0b3VjaC5wYWdlWCAhPT0gdW5kZWZpbmVkID8gdG91Y2gucGFnZVggOiB0b3VjaC5jbGllbnRYO1xuXHRcdFx0XHR2YXIgcG9zWSAgPSB0b3VjaC5wYWdlWSAhPT0gdW5kZWZpbmVkID8gdG91Y2gucGFnZVkgOiB0b3VjaC5jbGllbnRZO1xuXG5cdFx0XHRcdC8vIHN0b3AgcHJvY2Vzc2luZyB0aGUgZ2VzdHVyZSBpZiB0aGUgc3dpcGUgaGFzIGRyaWZ0ZWQgdG9vIG11Y2ggdmVydGljYWxseS5cblx0XHRcdFx0aWYgKE1hdGguYWJzKF9zd2lwZVN0YXJ0UG9pbnQueSAtIHBvc1kpID4gX3NlbGYuc3dpcGVNYXhEcmlmdCkge1xuXHRcdFx0XHRcdC8vIHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgdG8gc3RvcCB0aGUgcG90ZW50aWFsIGZvciBtdWx0aXBsZSBzd2lwZXMgb2NjdXJpbmcuXG5cdFx0XHRcdFx0cmVzZXQoKTtcblxuXHRcdFx0XHRcdC8vIHJldHVybiB0byBzdG9wIHByb2Nlc3NpbmcgdGhlIHN3aXBlLlxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBjaGVjayBpZiB0aGUgc3dpcGUgbW92ZWQgZW5vdWdoIGZyb20gaXRzIHN0YXJ0IHBvaW50IHRvIGJlIGNvbnNpZGVyZWQgYSBnZXN0dXJlLlxuXHRcdFx0XHRpZiAoTWF0aC5hYnMoX3N3aXBlU3RhcnRQb2ludC54IC0gcG9zWCkgPj0gX3NlbGYuc3dpcGVEaXN0YW5jZSkge1xuXHRcdFx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5kZWJ1ZyAoXCJLT3NsaWRlciA6OiBzd2lwZSBvY2N1cnJlZC4gcGl4ZWxzIHN3aXBlZDpcIiwgTWF0aC5hYnMoX3N3aXBlU3RhcnRQb2ludC54IC0gcG9zWCkpOyB9XG5cblx0XHRcdFx0XHRpZiAocG9zWCA+IF9zd2lwZVN0YXJ0UG9pbnQueCkgey8vIHJpZ2h0IHN3aXBlIG9jY3VycmVkXG5cdFx0XHRcdFx0XHRfLnByZXYoKTtcblx0XHRcdFx0XHR9IGVsc2UgeyAvLyBsZWZ0IHN3aXBlIG9jY3VycmVkXG5cdFx0XHRcdFx0XHRfLm5leHQoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyByZW1vdmUgZXZlbnQgbGlzdGVuZXJzIHRvIHN0b3AgdGhlIHBvdGVudGlhbCBmb3IgbXVsdGlwbGUgc3dpcGVzIG9jY3VyaW5nLlxuXHRcdFx0XHRcdHJlc2V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gdG91Y2hFbmRIYW5kbGVyICgpIHtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogdG91Y2hFbmRIYW5kbGVyIGV2ZW50JywgZXZlbnQpOyB9XG5cdFx0XHRcdC8vIHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgdG8gc3RvcCB0aGUgcG90ZW50aWFsIGZvciBtdWx0aXBsZSBzd2lwZXMgb2NjdXJpbmcuXG5cdFx0XHRcdHJlc2V0KCk7XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIHJlc2V0KCkge1xuXHRcdFx0XHQvLyByZXR1cm4gaWYgdGhlIGRlc3Ryb3kgbWV0aG9kIHdhcyBjYWxsZWQsIHJhdGhlciB0aGFuIGFkZGluZyB1bndhbnRlZCBsaXN0ZW5lcnMuXG5cdFx0XHRcdGlmICghX2luaXRpYWxpc2VkKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF8uc2xpZGUub2ZmKCd0b3VjaG1vdmUnLCB0b3VjaE1vdmVIYW5kbGVyKTtcblx0XHRcdFx0JCh3aW5kb3cpLm9mZigndG91Y2hlbmQnLCB0b3VjaEVuZEhhbmRsZXIpO1xuXHRcdFx0XHRfLnNsaWRlLm9uKCd0b3VjaHN0YXJ0JywgdG91Y2hTdGFydEhhbmRsZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEluaXRpYWxpc2UgdGhlIHN3aXBlIG1ldGhvZFxuXHRcdFx0ICogQHBhcmFtICB7aW50ZWdlcn0gc3dpcGVEaXN0YW5jZSBUaGUgZGlzdGFuY2UgbW92ZWQgYmVmb3JlIGEgc3dpcGUgaXMgdHJpZ2dlcmVkXG5cdFx0XHQgKiBAcGFyYW0gIHtpbnRlZ2VyfSBzd2lwZU1heERyaWZ0IFRoZSB2ZXJ0aWNhbCBkaXN0YW5jZSBhbGxvd2FibGUgYmVmb3JlIHRoZSBzd2lwZSBpcyBjYW5jZWxsZWRcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gaW5pdChzd2lwZURpc3RhbmNlLCBzd2lwZU1heERyaWZ0KSB7XG5cdFx0XHRcdGlmIChfaW5pdGlhbGlzZWQpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRfaW5pdGlhbGlzZWQgICAgID0gdHJ1ZTtcblx0XHRcdFx0X3N3aXBlU3RhcnRQb2ludCA9IHsgeDowLCB5OjAgfTtcblx0XHRcdFx0X3NlbGYuc3dpcGVEaXN0YW5jZSAgICAgID0gc3dpcGVEaXN0YW5jZTtcblx0XHRcdFx0X3NlbGYuc3dpcGVNYXhEcmlmdCAgICAgID0gc3dpcGVNYXhEcmlmdDtcblxuXHRcdFx0XHRfLnNsaWRlLm9uKCd0b3VjaHN0YXJ0JywgdG91Y2hTdGFydEhhbmRsZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbml0aWFsaXNlIHRoZSBzd2lwZVxuXHRcdFx0aW5pdCgxMDAsIDQwKTtcblx0XHR9O1xuXHR9O1xuXG5cdC8vICBDcmVhdGUgYSBqUXVlcnkgcGx1Z2luXG5cdCQuZm4uS09zbGlkZXIgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGVuID0gdGhpcy5sZW5ndGg7XG5cblx0XHQvLyAgRW5hYmxlIG11bHRpcGxlLXNsaWRlciBzdXBwb3J0XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0Ly8gIENhY2hlIGEgY29weSBvZiAkKHRoaXMpLCBzbyBpdFxuXHRcdFx0dmFyIG1lICAgICAgID0gJCh0aGlzKSxcblx0XHRcdFx0a2V5ICAgICAgPSAnS09zbGlkZXInICsgKGxlbiA+IDEgPyAnLScgKyArK2luZGV4IDogJycpLFxuXHRcdFx0XHRvcHRpb25zICA9IG1lLmRhdGEoJ2tvc2xpZGVyJyksXG5cdFx0XHRcdGluc3RhbmNlID0gKG5ldyBLT3NsaWRlcikuaW5pdChtZSwgb3B0aW9ucylcblx0XHRcdDtcblxuXHRcdFx0Ly8gIEludm9rZSBhbiBLT3NsaWRlciBpbnN0YW5jZVxuXHRcdFx0bWUuZGF0YShrZXksIGluc3RhbmNlKS5kYXRhKCdrZXknLCBrZXkpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdCQoJ1tkYXRhLWtvc2xpZGVyXScpLktPc2xpZGVyKCk7XG5cblx0S09zbGlkZXIudmVyc2lvbiA9IFwiMC41LjBcIjtcbn0pKGpRdWVyeSwgZmFsc2UpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9