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
			keys               : false,
			dots               : true,
			dotsClick          : false,
			arrows             : true,
			sliderEl           : '.KOslider',
			slide              : '.KOslider-slide',
			uiPosition         : 'before',
			customPrevBtnClass : undefined,
			customNextBtnClass : undefined,
			debug              : false,
			setHeight          : "auto",
			autoplay           : false,
			autoplayInterval   : 4000,
			swipe              : false,
			itemWidth          : undefined,
			inactiveClass      : 'KOslider--inactive',
			activeClass        : 'KOslider--active',
			callbacks          : {}
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
				html += '<button class="KOslider-UI-btn KOslider-UI-btn--previous ' + _.options.customPrevBtnClass + '" data-fn="prev" disabled>Previous</button>';
			}

			if (_.options.dots) {
				html += '<div class="KOslider-UI-dots">';
				$.each(_.slide, function() {
					html += '<span class="KOslider-UI-dot"></span>';
				});
				html += '</div>';
			}

			if (_.options.arrows) {
				html += '<button class="KOslider-UI-btn KOslider-UI-btn--next ' + _.options.customNextBtnClass + '" data-fn="next">Next</button>';
			}

			html += '</div></div>';

			if (_.options.uiPosition == 'before') {
				_.el.prepend(html);
			} if (_.options.uiPosition == 'after') {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbWl0LWRlYm91bmNlLmpzIiwianF1ZXJ5LUtPc2xpZGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoianF1ZXJ5LUtPc2xpZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBkZWJvdW5jZVxuICogQHBhcmFtIHtpbnRlZ2VyfSBtaWxsaXNlY29uZHMgVGhpcyBwYXJhbSBpbmRpY2F0ZXMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHNcbiAqICAgICB0byB3YWl0IGFmdGVyIHRoZSBsYXN0IGNhbGwgYmVmb3JlIGNhbGxpbmcgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIC5cbiAqIEByZXR1cm4ge2Z1bmN0aW9ufSBUaGlzIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdoZW4gY2FsbGVkIHdpbGwgd2FpdCB0aGVcbiAqICAgICBpbmRpY2F0ZWQgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBhZnRlciB0aGUgbGFzdCBjYWxsIGJlZm9yZVxuICogICAgIGNhbGxpbmcgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICovXG5GdW5jdGlvbi5wcm90b3R5cGUuZGVib3VuY2UgPSBmdW5jdGlvbiAobWlsbGlzZWNvbmRzKSB7XG5cdHZhciBiYXNlRnVuY3Rpb24gPSB0aGlzLFxuXHRcdHRpbWVyID0gbnVsbCxcblx0XHR3YWl0ID0gbWlsbGlzZWNvbmRzO1xuXG5cdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0YXJncyA9IGFyZ3VtZW50cztcblxuXHRcdGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuXHRcdFx0YmFzZUZ1bmN0aW9uLmFwcGx5KHNlbGYsIGFyZ3MpO1xuXHRcdFx0dGltZXIgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmICh0aW1lcikge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0XHR9XG5cblx0XHR0aW1lciA9IHNldFRpbWVvdXQoY29tcGxldGUsIHdhaXQpO1xuXHR9O1xufTtcbiIsIi8qKlxuICogS09zbGlkZXIgYnkgQG1ybWFydGluZWF1XG4gKlxuICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tcm1hcnRpbmVhdS9LT3NsaWRlciBmb3IgZG9jdW1lbnRhdGlvbiBhbmQgZGVtb3NcbiAqL1xuXG4oZnVuY3Rpb24oJCwgZikge1xuXHR2YXIgS09zbGlkZXIgPSBmdW5jdGlvbigpIHtcblx0XHQvLyAgT2JqZWN0IGNsb25lXG5cdFx0dmFyIF8gPSB0aGlzO1xuXG5cdFx0Ly8gU2V0IHNvbWUgZGVmYXVsdCBvcHRpb25zXG5cdFx0Xy5vcHRpb25zID0ge1xuXHRcdFx0a2V5cyAgICAgICAgICAgICAgIDogZmFsc2UsXG5cdFx0XHRkb3RzICAgICAgICAgICAgICAgOiB0cnVlLFxuXHRcdFx0ZG90c0NsaWNrICAgICAgICAgIDogZmFsc2UsXG5cdFx0XHRhcnJvd3MgICAgICAgICAgICAgOiB0cnVlLFxuXHRcdFx0c2xpZGVyRWwgICAgICAgICAgIDogJy5LT3NsaWRlcicsXG5cdFx0XHRzbGlkZSAgICAgICAgICAgICAgOiAnLktPc2xpZGVyLXNsaWRlJyxcblx0XHRcdHVpUG9zaXRpb24gICAgICAgICA6ICdiZWZvcmUnLFxuXHRcdFx0Y3VzdG9tUHJldkJ0bkNsYXNzIDogdW5kZWZpbmVkLFxuXHRcdFx0Y3VzdG9tTmV4dEJ0bkNsYXNzIDogdW5kZWZpbmVkLFxuXHRcdFx0ZGVidWcgICAgICAgICAgICAgIDogZmFsc2UsXG5cdFx0XHRzZXRIZWlnaHQgICAgICAgICAgOiBcImF1dG9cIixcblx0XHRcdGF1dG9wbGF5ICAgICAgICAgICA6IGZhbHNlLFxuXHRcdFx0YXV0b3BsYXlJbnRlcnZhbCAgIDogNDAwMCxcblx0XHRcdHN3aXBlICAgICAgICAgICAgICA6IGZhbHNlLFxuXHRcdFx0aXRlbVdpZHRoICAgICAgICAgIDogdW5kZWZpbmVkLFxuXHRcdFx0aW5hY3RpdmVDbGFzcyAgICAgIDogJ0tPc2xpZGVyLS1pbmFjdGl2ZScsXG5cdFx0XHRhY3RpdmVDbGFzcyAgICAgICAgOiAnS09zbGlkZXItLWFjdGl2ZScsXG5cdFx0XHRjYWxsYmFja3MgICAgICAgICAgOiB7fVxuXHRcdH07XG5cblx0XHRfLmluaXQgPSBmdW5jdGlvbihlbCwgb3B0aW9ucykge1xuXHRcdFx0Ly8gIENoZWNrIHdoZXRoZXIgd2UncmUgcGFzc2luZyBhbnkgb3B0aW9ucyBpbiB0byBLT3NsaWRlclxuXHRcdFx0Xy5vcHRpb25zID0gJC5leHRlbmQoXy5vcHRpb25zLCBvcHRpb25zKTtcblx0XHRcdF8uZWwgICAgICA9IGVsOyAvLyAuS09zbGlkZXJDb250YWluZXJcblx0XHRcdF8uc2xpZGVyICA9IGVsLmZpbmQoXy5vcHRpb25zLnNsaWRlckVsKTtcblx0XHRcdF8uc2xpZGUgICA9IF8uc2xpZGVyLmZpbmQoXy5vcHRpb25zLnNsaWRlKTtcblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ0tPc2xpZGVyIDo6XFxuXFx0T3B0aW9uczpcXG5cXHRcXHQnLCBfLm9wdGlvbnMpOyB9XG5cblx0XHRcdC8vIElmIGZld2VyIHRoYW4gMiBjaGlsZHJlbiBkbyBub3Qgc2V0dXAgS09zbGlkZXJcblx0XHRcdGlmICggXy5zbGlkZS5sZW5ndGggPCAyKSB7XG5cdFx0XHRcdGVsLmFkZENsYXNzKF8ub3B0aW9ucy5pbmFjdGl2ZUNsYXNzKTtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogbm90IGVub3VnaCBlbGVtZW50cyB0byBtYWtlIGEgc2xpZGVyJywgb3B0aW9ucyk7IH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBlbC5hZGRDbGFzcyhfLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG5cdFx0XHQvLyAgQ2FjaGVkIHZhcnNcblx0XHRcdHZhciBvcHRpb25zID0gXy5vcHRpb25zO1xuXHRcdFx0dmFyIHNsaWRlICAgPSBfLnNsaWRlO1xuXHRcdFx0dmFyIGxlbiAgICAgPSBzbGlkZS5sZW5ndGg7XG5cblx0XHRcdC8vIFNldCB1cCBzb21lIG90aGVyIHZhcnNcblx0XHRcdF8ubGVmdE9mZnNldCA9IDA7XG5cdFx0XHRfLmluZGV4ICAgICAgPSAwOyAvLyBDdXJyZW50IGluZGV4XG5cdFx0XHRfLm1pbiAgICAgICAgPSAwO1xuXHRcdFx0Xy5jb3VudCAgICAgID0gbGVuIC0gMTtcblxuXHRcdFx0Ly8gUmVzaXplOiBDaGVjayBhbmQgY2hhbmdlIHNpemVzIGlmIG5lZWRlZFxuXHRcdFx0JCh3aW5kb3cpLnJlc2l6ZSgkLnByb3h5KF8uZ2V0V2lkdGguZGVib3VuY2UoNTAwKSwgdGhpcykpLnRyaWdnZXIoJ3Jlc2l6ZScpO1xuXG5cdFx0XHRfLmVsLm9uKCdjbGljaycsICcuS09zbGlkZXItVUktYnRuJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0dmFyIGZuID0gJCh0aGlzKS5kYXRhKCdmbicpOyAvLyBDaG9vc2UgbmV4dCBvciBwcmV2XG5cdFx0XHRcdF9bZm5dKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gIEtleXByZXNzZXNcblx0XHRcdGlmIChvcHRpb25zLmtleXMpIHsgXy5rZXlwcmVzc2VzKCk7IH1cblxuXHRcdFx0Ly8gQ2xpY2thYmxlIGRvdHNcblx0XHRcdGlmIChvcHRpb25zLmRvdHNDbGljaykgeyBfLmRvdHNDbGljaygpOyB9XG5cblx0XHRcdC8vIEF1dG9wbGF5XG5cdFx0XHRpZiAob3B0aW9ucy5hdXRvcGxheSkgeyBfLmF1dG9wbGF5KCk7IH1cblxuXHRcdFx0Ly8gQXV0b3BsYXlcblx0XHRcdGlmIChvcHRpb25zLnN3aXBlKSB7IF8uc3dpcGUoKTsgfVxuXG5cdFx0XHRyZXR1cm4gXztcblx0XHR9O1xuXG5cblx0XHQkLmZuLktPc2xpZGVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0XHRcdF8uc2xpZGVyLmNzcygnd2lkdGgnLCAnYXV0bycpLmRhdGEoe0tPc2xpZGVyOiB1bmRlZmluZWQsIGtleTogdW5kZWZpbmVkfSk7XG5cdFx0XHRfLnNsaWRlci5maW5kKCcuS09zbGlkZXItVUknKS5yZW1vdmUoKTtcblx0XHRcdF8uc2xpZGUuY3NzKCd3aWR0aCcsICdhdXRvJyk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogR28gdG8gc2xpZGVcblx0XHQgKiBAcmV0dXJuIHtpbnRlZ2VyfSBHbyB0byBzbGlkZVxuXHRcdCAqIFZhbHVlIHNob3VsZCBiZSB6ZXJvLWluZGV4ZWQgbnVtYmVyIGZvciBwYXJ0aWN1bGFyIGUuZy4gMCwgMSwgMiBldGNcblx0XHQgKi9cblx0XHRfLmdvdG8gPSBmdW5jdGlvbih4KSB7XG5cdFx0XHRpZiAoXy50b29UaGluKSB7XG5cdFx0XHRcdF8ubGVmdE9mZnNldCA9IDA7XG5cdFx0XHRcdF8ucmVhY2hlZEVuZCA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIGlmIChfLmxlZnRPZmZzZXQgPCBfLm1heCB8fCAtKHggKiBfLml0ZW1XaWR0aCkgPCBfLm1heCkge1xuXHRcdFx0XHRfLmxlZnRPZmZzZXQgPSBfLm1heDtcblx0XHRcdFx0Xy5yZWFjaGVkRW5kID0gdHJ1ZTtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogcmVhY2hlZEVuZCA9IHRydWUnKTsgfVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Xy5sZWZ0T2Zmc2V0ID0gLSh4ICogXy5pdGVtV2lkdGgpO1xuXHRcdFx0XHRfLnJlYWNoZWRFbmQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Xy5pbmRleCA9IHg7XG5cblx0XHRcdF8uc2V0SGVpZ2h0KHgpO1xuXG5cdFx0XHRfLnNsaWRlci5jc3MoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGVYKCcgKyBfLmxlZnRPZmZzZXQgKyAncHgpJyk7XG5cblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0tPc2xpZGVyIDo6XFxuXFx0Xy5nb3RvKCkgOjogXFxuXFx0XFx0eCcsIHgsICdcXG5cXHRcXHRsZWZ0T2Zmc2V0OicsIF8ubGVmdE9mZnNldCwgJ1xcblxcdFxcdGluZGV4JywgXy5pbmRleCwgJ1xcblxcdFxcdGl0ZW1XaWR0aDonLCBfLml0ZW1XaWR0aCwgJ1xcblxcdFxcdG1vdmUgYW1vdW50OicsIF8ubGVmdE9mZnNldCAvIF8uaW5kZXgpO1xuXHRcdFx0fVxuXG5cdFx0XHRfLm5hdlN0YXRlKCk7XG5cblx0XHRcdGlmIChfLm9wdGlvbnMuY2FsbGJhY2tzLm9uQ2hhbmdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0ZXZhbChfLm9wdGlvbnMuY2FsbGJhY2tzLm9uQ2hhbmdlKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogTW92ZSB0byBuZXh0IGl0ZW1cblx0XHQgKi9cblx0XHRfLm5leHQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtb3ZlVG87XG5cdFx0XHRpZiAoXy5pbmRleCA8IF8uY291bnQpIHtcblx0XHRcdFx0bW92ZVRvID0gXy5pbmRleCArIDE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb3ZlVG8gPSBfLmNvdW50O1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdF8uZ290byhtb3ZlVG8pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBNb3ZlIHRvIHByZXZpb3VzIGl0ZW1cblx0XHQgKi9cblx0XHRfLnByZXYgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtb3ZlVG87XG5cdFx0XHRpZiAoXy5pbmRleCA+IDApIHtcblx0XHRcdFx0bW92ZVRvID0gXy5pbmRleCAtIDE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb3ZlVG8gPSAwO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdF8uZ290byhtb3ZlVG8pO1xuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIENoYW5nZSBuYXYgc3RhdGVcblx0XHQgKi9cblx0XHRfLm5hdlN0YXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYXRTdGFydDtcblx0XHRcdHZhciBhdEVuZDtcblxuXHRcdFx0Ly8gRW5hYmxlL0Rpc2FibGUgdGhlIHByZXYgYnRuXG5cdFx0XHRpZiAoXy5pbmRleCA9PT0gMCkge1xuXHRcdFx0XHRhdFN0YXJ0ID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF0U3RhcnQgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRW5hYmxlL0Rpc2FibGUgdGhlIG5leHQgYnRuLlxuXHRcdFx0aWYgKF8uaW5kZXggPT09IF8uY291bnQgfHwgXy5yZWFjaGVkRW5kKSB7XG5cdFx0XHRcdGF0RW5kID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF0RW5kID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdF8uZWwuZmluZCgnLktPc2xpZGVyLVVJLWJ0bi0tcHJldmlvdXMnKS5wcm9wKCdkaXNhYmxlZCcsIGF0U3RhcnQpO1xuXHRcdFx0Xy5lbC5maW5kKCcuS09zbGlkZXItVUktYnRuLS1uZXh0JykucHJvcCgnZGlzYWJsZWQnLCBhdEVuZCk7XG5cblx0XHRcdC8vIFNldCBmaXJzdCBkb3QgdG8gYmUgYWN0aXZlXG5cdFx0XHRfLmVsLmZpbmQoJy5LT3NsaWRlci1VSS1kb3QnKS5lcShfLmluZGV4KS5hZGRDbGFzcygnaXMtYWN0aXZlJykuc2libGluZ3MoKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIEdldCBzaXplIG9mIC5zbGlkZXIgYW5kIHRoZW4gcnVuIF8uc2V0U2l6ZXMoKVxuXHRcdCAqL1xuXHRcdF8uZ2V0V2lkdGggPSBmdW5jdGlvbigpIHtcblx0XHRcdF8uaXRlbVdpZHRoID0gcGFyc2VJbnQoXy5vcHRpb25zLml0ZW1XaWR0aCkgPiAwID8gcGFyc2VJbnQoXy5vcHRpb25zLml0ZW1XaWR0aCkgOiBfLmVsLndpZHRoKCk7XG5cdFx0XHRfLnNldFNpemUoXy5pdGVtV2lkdGgpO1xuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIFNldCBzaXplcyBmb3IgZWxlbWVudFxuXHRcdCAqL1xuXHRcdF8uc2V0U2l6ZSA9IGZ1bmN0aW9uKGl0ZW1XaWR0aCkge1xuXHRcdFx0dmFyICRjb250YWluZXJXaWR0aCA9IF8uZWwud2lkdGgoKTsgICAgICAgICAgICAgICAvLyBDb250YWluZXIgd2lkdGhcblx0XHRcdHZhciAkc2xpZGVyV2lkdGggICAgPSBfLnNsaWRlLmxlbmd0aCAqIGl0ZW1XaWR0aDsgLy8gZnVsbCB3aWR0aCBvZiBzbGlkZXIgd2l0aCBhbGwgaXRlbXMgZmxvYXRlZFxuXHRcdFx0Xy5tYXggICAgICAgICAgICAgICA9IE1hdGgucm91bmQoLSgkc2xpZGVyV2lkdGggLSAkY29udGFpbmVyV2lkdGgpKTtcblx0XHRcdF8ubGVmdE9mZnNldCAgICAgICAgPSAtKGl0ZW1XaWR0aCAqIF8uaW5kZXgpO1xuXG5cdFx0XHRfLnNsaWRlci5jc3Moe1xuXHRcdFx0XHR3aWR0aCAgICA6IE1hdGgucm91bmQoJHNsaWRlcldpZHRoKSxcblx0XHRcdFx0dHJhbnNmb3JtOiAndHJhbnNsYXRlWCgnICsgXy5sZWZ0T2Zmc2V0ICsgJ3B4KSdcblx0XHRcdH0pO1xuXHRcdFx0Xy5zbGlkZS5jc3MoeyB3aWR0aDogaXRlbVdpZHRoIH0pO1xuXG5cdFx0XHRfLnNldEhlaWdodChfLmluZGV4KTtcblxuXHRcdFx0Ly8gQ3JlYXRlIFVJIGlmIHRoZXJlIGlzIGVub3VnaCBzcGFjZSB0byBkbyBzb1xuXHRcdFx0aWYgKCRzbGlkZXJXaWR0aCA+ICRjb250YWluZXJXaWR0aCkge1xuXHRcdFx0XHQvLyBDcmVhdGUgVUkgLSBEb3RzIGFuZCBuZXh0L3ByZXYgYnV0dG9uc1xuXHRcdFx0XHRpZiAoXy5lbC5maW5kKCcuS09zbGlkZXItVUknKS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRfLmNyZWF0ZVVJKCk7XG5cdFx0XHRcdFx0Xy50b29UaGluID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdF8uZWwuZmluZCgnLktPc2xpZGVyLVVJJykucmVtb3ZlKCk7XG5cdFx0XHRcdF8udG9vVGhpbiA9IHRydWU7XG5cdFx0XHRcdGlmIChfLmxlZnRPZmZzZXQgIT09IDApIHtcblx0XHRcdFx0XHRfLmxlZnRPZmZzZXQgPSAwO1xuXHRcdFx0XHRcdF8uZ290bygwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OlxcblxcdF8uc2V0U2l6ZSgpIDo6IFxcblxcdFxcdF8ubWF4OicsIF8ubWF4ICwgJ1xcblxcdFxcdF8ubWluOicsIF8ubWluLCAnXFxuXFx0XFx0bGVmdE9mZnNldDonLCBfLmxlZnRPZmZzZXQsICdcXG5cXHRcXHRpbmRleCcsIF8uaW5kZXgsICdcXG5cXHRcXHRpdGVtV2lkdGg6JywgXy5pdGVtV2lkdGgsICdcXG5cXHRcXHRfLnNsaWRlLmxlbmd0aCcsIF8uc2xpZGUubGVuZ3RoLCAnXFxuXFx0XFx0JHNsaWRlcldpZHRoJywgJHNsaWRlcldpZHRoKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBTZXQgaGVpZ2h0IG9mIDx1bD4gYmFzZWQgb24gaGVpZ2h0Q2hhbmdlIG9wdGlvblxuXHRcdCAqL1xuXHRcdF8uc2V0SGVpZ2h0ID0gZnVuY3Rpb24oZXEpIHtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5zZXRIZWlnaHQgPT0gXCJhdXRvXCIpIHtcblx0XHRcdFx0XHR2YXIgbmV3SGVpZ2h0ID0gXy5zbGlkZS5lcShlcSkuaGVpZ2h0KCk7XG5cdFx0XHRcdFx0Xy5zbGlkZXIuaGVpZ2h0KG5ld0hlaWdodCk7XG5cdFx0XHRcdH0gZWxzZSBpZihfLm9wdGlvbnMuc2V0SGVpZ2h0ID09IFwiZXF1YWxcIikge1xuXHRcdFx0XHRcdF8uZXF1YWxpemVIZWlnaHRzKCk7XG5cdFx0XHRcdH1cblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBFcXVhbGlzZSBIZWlnaHRzIF8uZXF1YWxpemVIZWlnaHRzKClcblx0XHQgKi9cblx0XHRfLmVxdWFsaXplSGVpZ2h0cyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnRXF1YWwgdHJ1ZScpOyB9XG5cdFx0XHR2YXIgaGlnaGVzdEJveCA9IDA7XG5cdFx0XHR2YXIgJGVxdWFsaXNlRWwgPSBfLm9wdGlvbnMuZXF1YWxpc2VFbDtcblxuXHRcdFx0Xy5zbGlkZXIuZmluZCgkZXF1YWxpc2VFbCkuZWFjaChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKHRoaXMpLnJlbW92ZUF0dHIoJ3N0eWxlJyk7XG5cblx0XHRcdFx0aWYoICQodGhpcykuaGVpZ2h0KCkgPiBoaWdoZXN0Qm94ICkge1xuXHRcdFx0XHRcdGhpZ2hlc3RCb3ggPSAkKHRoaXMpLmhlaWdodCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdF8uc2xpZGVyLmZpbmQoJGVxdWFsaXNlRWwpLmNzcygnaGVpZ2h0JywgaGlnaGVzdEJveCk7XG5cdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OlxcblxcdF8uZXF1YWxpemVIZWlnaHRzKCkgOjogXFxuXFx0XFx0aGlnaGVzdEJveDonLCBoaWdoZXN0Qm94KTsgfVxuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZSB0aGUgVUlcblx0XHQgKiBEb3RzIDogd2lsbCBzaG93IGlmIGRvdHMgPSB0cnVlXG5cdFx0ICogQXJyb3dzIDogd2lsbCBzaG93IGlmIGFycm93cyA9IHRydWVcblx0XHQgKi9cblx0XHRfLmNyZWF0ZVVJID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRodG1sID0gJzxkaXYgY2xhc3M9XCJLT3NsaWRlci1VSSBLT3NsaWRlci1VSS0tJyArIF8ub3B0aW9ucy51aVBvc2l0aW9uICsgJyBjbGVhcmZpeFwiPjxkaXYgY2xhc3M9XCJLT3NsaWRlci1VSS1wYWdlcnNcIj4nO1xuXG5cdFx0XHRpZiAoXy5vcHRpb25zLmFycm93cykge1xuXHRcdFx0XHRodG1sICs9ICc8YnV0dG9uIGNsYXNzPVwiS09zbGlkZXItVUktYnRuIEtPc2xpZGVyLVVJLWJ0bi0tcHJldmlvdXMgJyArIF8ub3B0aW9ucy5jdXN0b21QcmV2QnRuQ2xhc3MgKyAnXCIgZGF0YS1mbj1cInByZXZcIiBkaXNhYmxlZD5QcmV2aW91czwvYnV0dG9uPic7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfLm9wdGlvbnMuZG90cykge1xuXHRcdFx0XHRodG1sICs9ICc8ZGl2IGNsYXNzPVwiS09zbGlkZXItVUktZG90c1wiPic7XG5cdFx0XHRcdCQuZWFjaChfLnNsaWRlLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRodG1sICs9ICc8c3BhbiBjbGFzcz1cIktPc2xpZGVyLVVJLWRvdFwiPjwvc3Bhbj4nO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHRcdH1cblxuXHRcdFx0aWYgKF8ub3B0aW9ucy5hcnJvd3MpIHtcblx0XHRcdFx0aHRtbCArPSAnPGJ1dHRvbiBjbGFzcz1cIktPc2xpZGVyLVVJLWJ0biBLT3NsaWRlci1VSS1idG4tLW5leHQgJyArIF8ub3B0aW9ucy5jdXN0b21OZXh0QnRuQ2xhc3MgKyAnXCIgZGF0YS1mbj1cIm5leHRcIj5OZXh0PC9idXR0b24+Jztcblx0XHRcdH1cblxuXHRcdFx0aHRtbCArPSAnPC9kaXY+PC9kaXY+JztcblxuXHRcdFx0aWYgKF8ub3B0aW9ucy51aVBvc2l0aW9uID09ICdiZWZvcmUnKSB7XG5cdFx0XHRcdF8uZWwucHJlcGVuZChodG1sKTtcblx0XHRcdH0gaWYgKF8ub3B0aW9ucy51aVBvc2l0aW9uID09ICdhZnRlcicpIHtcblx0XHRcdFx0Xy5lbC5hcHBlbmQoaHRtbCk7XG5cdFx0XHR9XG5cdFx0XHRfLmVsLmZpbmQoJy5LT3NsaWRlci1VSS1kb3QnKS5lcSgwKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG5cdFx0fTtcblxuXG5cdFx0LyoqXG5cdFx0ICogSWYga2V5cyA9PT0gdHJ1ZSwgdXNlIHJpZ2h0IGFuZCBsZWZ0IGtleXMgdG8gbmF2aWdhdGUgYmV0d2VlbiBzbGlkZXNcblx0XHQgKi9cblx0XHRfLmtleXByZXNzZXMgPSBmdW5jdGlvbigpIHtcblx0XHRcdCQoZG9jdW1lbnQpLmtleWRvd24oZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR2YXIga2V5ID0gZS53aGljaDtcblx0XHRcdFx0aWYgKGtleSA9PSAzNyl7XG5cdFx0XHRcdFx0Xy5wcmV2KCk7IC8vIExlZnRcblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT0gMzkpe1xuXHRcdFx0XHRcdF8ubmV4dCgpOyAvLyBSaWdodFxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cblx0XHQvKipcblx0XHQgKiBJZiBkb3RzQ2xpY2sgPT09IHRydWUsIGFsbG93IHRoZSBkb3RzIHRvIGJlIGNsaWNrZWRcblx0XHQgKi9cblx0XHRfLmRvdHNDbGljayA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Xy5lbC5vbignY2xpY2snLCAnLktPc2xpZGVyLVVJLWRvdCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMpLmluZGV4KCk7XG5cdFx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ3RhcmdldCcsIHRhcmdldCk7IH1cblx0XHRcdFx0Xy5nb3RvKHRhcmdldCk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogSWYgXy5vcHRpb25zLmF1dG9wbGF5ID0gdHJ1ZSwgc2xpZGVzIHdpbGwgYXV0cGxheVxuXHRcdCAqL1xuXHRcdF8uYXV0b3BsYXkgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmIChfLm9wdGlvbnMuZGVidWcpIHsgY29uc29sZS5sb2coJ0tPc2xpZGVyIDo6IEF1dG9wbGF5IEtPc2xpZGVyLiBBcmUgeW91IHN1cmUgeW91IHdhbnQgdGhpcz8/Jyk7IH1cblxuXHRcdFx0ZnVuY3Rpb24gaW50ZXJ2YWwoKSB7XG5cdFx0XHRcdHZhciBuZXh0UG9zID0gXy5pbmRleCA8IF8uY291bnQgPyBfLmluZGV4ICsgMSA6IDA7XG5cdFx0XHRcdF8uZ290byhuZXh0UG9zKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGF1dG8gPSB3aW5kb3cuc2V0SW50ZXJ2YWwoaW50ZXJ2YWwsIF8ub3B0aW9ucy5hdXRvcGxheUludGVydmFsKTtcblxuXHRcdFx0Xy5lbC5vbih7XG5cdFx0XHRcdG1vdXNlb3ZlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0d2luZG93LmNsZWFySW50ZXJ2YWwoYXV0byk7XG5cdFx0XHRcdFx0YXV0byA9IG51bGw7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG1vdXNlb3V0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRhdXRvID0gd2luZG93LnNldEludGVydmFsKGludGVydmFsLCBfLm9wdGlvbnMuYXV0b3BsYXlJbnRlcnZhbCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH07XG5cblxuXHRcdC8qKlxuXHRcdCAqIFN3aXBlIHNsaWRlc1xuXHRcdCAqIElmIF8ub3B0aW9ucy5zd2lwZSA9IHRydWUsIHNsaWRlcyB3aWxsIGJlIHN3aXBlYWJsZVxuXHRcdCAqL1xuXHRcdF8uc3dpcGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBfc2VsZiAgICAgICAgICAgICAgICA9IF8uc3dpcGU7XG5cdFx0XHR2YXIgX2luaXRpYWxpc2VkICAgICAgICAgPSBmYWxzZTtcblx0XHRcdHZhciBfc3dpcGVTdGFydFBvaW50ICAgICA9IG51bGw7XG5cblx0XHRcdF9zZWxmLnN3aXBlRGlzdGFuY2UgICAgICA9IG51bGw7XG5cdFx0XHRfc2VsZi5zd2lwZU1heERyaWZ0ICAgICAgPSBudWxsO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFB1YmxpYyBtZXRob2QgdG8gZGVzdHJveSB0aGUgc3dpcGUgZnVuY3Rpb25hbGl0eVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBkZXN0cm95KCkge1xuXHRcdFx0XHRfLnNsaWRlLm9mZigndG91Y2hzdGFydCcsIHRvdWNoU3RhcnRIYW5kbGVyKTtcblx0XHRcdFx0Xy5zbGlkZS5vZmYoJ3RvdWNobW92ZScsIHRvdWNoTW92ZUhhbmRsZXIpO1xuXHRcdFx0XHQkKHdpbmRvdykub2ZmKCd0b3VjaGVuZCcsIHRvdWNoRW5kSGFuZGxlcik7XG5cblx0XHRcdFx0X2luaXRpYWxpc2VkICAgICA9IGZhbHNlO1xuXHRcdFx0XHRfc3dpcGVTdGFydFBvaW50ID0geyB4OjAsIHk6MCB9O1xuXHRcdFx0XHRfc2VsZi5zd2lwZURpc3RhbmNlICAgICAgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiB0b3VjaFN0YXJ0SGFuZGxlcihldmVudCkge1xuXHRcdFx0XHRfLnNsaWRlLm9mZigndG91Y2hzdGFydCcsIHRvdWNoU3RhcnRIYW5kbGVyKTtcblx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnS09zbGlkZXIgOjogdG91Y2hTdGFydEhhbmRsZXIgZXZlbnQnLCBldmVudCk7IH1cblx0XHRcdFx0dmFyIHRvdWNoID0gZXZlbnQub3JpZ2luYWxFdmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcblxuXHRcdFx0XHQvLyBzdG9yZSB0aGUgc3RhcnQgcG9pbnQgb2YgdGhlIHRvdWNoLlxuXHRcdFx0XHRfc3dpcGVTdGFydFBvaW50LnggPSB0b3VjaC5wYWdlWCAhPT0gdW5kZWZpbmVkID8gdG91Y2gucGFnZVggOiB0b3VjaC5jbGllbnRYO1xuXHRcdFx0XHRfc3dpcGVTdGFydFBvaW50LnkgPSB0b3VjaC5wYWdlWSAhPT0gdW5kZWZpbmVkID8gdG91Y2gucGFnZVkgOiB0b3VjaC5jbGllbnRZO1xuXG5cdFx0XHRcdF8uc2xpZGUub24oJ3RvdWNobW92ZScsIHRvdWNoTW92ZUhhbmRsZXIpO1xuXHRcdFx0XHQkKHdpbmRvdykub24oJ3RvdWNoZW5kJywgdG91Y2hFbmRIYW5kbGVyKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gdG91Y2hNb3ZlSGFuZGxlcihldmVudCkge1xuXHRcdFx0XHR2YXIgdG91Y2ggPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF07XG5cdFx0XHRcdHZhciBwb3NYICA9IHRvdWNoLnBhZ2VYICE9PSB1bmRlZmluZWQgPyB0b3VjaC5wYWdlWCA6IHRvdWNoLmNsaWVudFg7XG5cdFx0XHRcdHZhciBwb3NZICA9IHRvdWNoLnBhZ2VZICE9PSB1bmRlZmluZWQgPyB0b3VjaC5wYWdlWSA6IHRvdWNoLmNsaWVudFk7XG5cblx0XHRcdFx0Ly8gc3RvcCBwcm9jZXNzaW5nIHRoZSBnZXN0dXJlIGlmIHRoZSBzd2lwZSBoYXMgZHJpZnRlZCB0b28gbXVjaCB2ZXJ0aWNhbGx5LlxuXHRcdFx0XHRpZiAoTWF0aC5hYnMoX3N3aXBlU3RhcnRQb2ludC55IC0gcG9zWSkgPiBfc2VsZi5zd2lwZU1heERyaWZ0KSB7XG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIGV2ZW50IGxpc3RlbmVycyB0byBzdG9wIHRoZSBwb3RlbnRpYWwgZm9yIG11bHRpcGxlIHN3aXBlcyBvY2N1cmluZy5cblx0XHRcdFx0XHRyZXNldCgpO1xuXG5cdFx0XHRcdFx0Ly8gcmV0dXJuIHRvIHN0b3AgcHJvY2Vzc2luZyB0aGUgc3dpcGUuXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIGNoZWNrIGlmIHRoZSBzd2lwZSBtb3ZlZCBlbm91Z2ggZnJvbSBpdHMgc3RhcnQgcG9pbnQgdG8gYmUgY29uc2lkZXJlZCBhIGdlc3R1cmUuXG5cdFx0XHRcdGlmIChNYXRoLmFicyhfc3dpcGVTdGFydFBvaW50LnggLSBwb3NYKSA+PSBfc2VsZi5zd2lwZURpc3RhbmNlKSB7XG5cdFx0XHRcdFx0aWYgKF8ub3B0aW9ucy5kZWJ1ZykgeyBjb25zb2xlLmRlYnVnIChcIktPc2xpZGVyIDo6IHN3aXBlIG9jY3VycmVkLiBwaXhlbHMgc3dpcGVkOlwiLCBNYXRoLmFicyhfc3dpcGVTdGFydFBvaW50LnggLSBwb3NYKSk7IH1cblxuXHRcdFx0XHRcdGlmIChwb3NYID4gX3N3aXBlU3RhcnRQb2ludC54KSB7Ly8gcmlnaHQgc3dpcGUgb2NjdXJyZWRcblx0XHRcdFx0XHRcdF8ucHJldigpO1xuXHRcdFx0XHRcdH0gZWxzZSB7IC8vIGxlZnQgc3dpcGUgb2NjdXJyZWRcblx0XHRcdFx0XHRcdF8ubmV4dCgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgdG8gc3RvcCB0aGUgcG90ZW50aWFsIGZvciBtdWx0aXBsZSBzd2lwZXMgb2NjdXJpbmcuXG5cdFx0XHRcdFx0cmVzZXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiB0b3VjaEVuZEhhbmRsZXIgKCkge1xuXHRcdFx0XHRpZiAoXy5vcHRpb25zLmRlYnVnKSB7IGNvbnNvbGUubG9nKCdLT3NsaWRlciA6OiB0b3VjaEVuZEhhbmRsZXIgZXZlbnQnLCBldmVudCk7IH1cblx0XHRcdFx0Ly8gcmVtb3ZlIGV2ZW50IGxpc3RlbmVycyB0byBzdG9wIHRoZSBwb3RlbnRpYWwgZm9yIG11bHRpcGxlIHN3aXBlcyBvY2N1cmluZy5cblx0XHRcdFx0cmVzZXQoKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gcmVzZXQoKSB7XG5cdFx0XHRcdC8vIHJldHVybiBpZiB0aGUgZGVzdHJveSBtZXRob2Qgd2FzIGNhbGxlZCwgcmF0aGVyIHRoYW4gYWRkaW5nIHVud2FudGVkIGxpc3RlbmVycy5cblx0XHRcdFx0aWYgKCFfaW5pdGlhbGlzZWQpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0Xy5zbGlkZS5vZmYoJ3RvdWNobW92ZScsIHRvdWNoTW92ZUhhbmRsZXIpO1xuXHRcdFx0XHQkKHdpbmRvdykub2ZmKCd0b3VjaGVuZCcsIHRvdWNoRW5kSGFuZGxlcik7XG5cdFx0XHRcdF8uc2xpZGUub24oJ3RvdWNoc3RhcnQnLCB0b3VjaFN0YXJ0SGFuZGxlcik7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogSW5pdGlhbGlzZSB0aGUgc3dpcGUgbWV0aG9kXG5cdFx0XHQgKiBAcGFyYW0gIHtpbnRlZ2VyfSBzd2lwZURpc3RhbmNlIFRoZSBkaXN0YW5jZSBtb3ZlZCBiZWZvcmUgYSBzd2lwZSBpcyB0cmlnZ2VyZWRcblx0XHRcdCAqIEBwYXJhbSAge2ludGVnZXJ9IHN3aXBlTWF4RHJpZnQgVGhlIHZlcnRpY2FsIGRpc3RhbmNlIGFsbG93YWJsZSBiZWZvcmUgdGhlIHN3aXBlIGlzIGNhbmNlbGxlZFxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBpbml0KHN3aXBlRGlzdGFuY2UsIHN3aXBlTWF4RHJpZnQpIHtcblx0XHRcdFx0aWYgKF9pbml0aWFsaXNlZCkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdF9pbml0aWFsaXNlZCAgICAgPSB0cnVlO1xuXHRcdFx0XHRfc3dpcGVTdGFydFBvaW50ID0geyB4OjAsIHk6MCB9O1xuXHRcdFx0XHRfc2VsZi5zd2lwZURpc3RhbmNlICAgICAgPSBzd2lwZURpc3RhbmNlO1xuXHRcdFx0XHRfc2VsZi5zd2lwZU1heERyaWZ0ICAgICAgPSBzd2lwZU1heERyaWZ0O1xuXG5cdFx0XHRcdF8uc2xpZGUub24oJ3RvdWNoc3RhcnQnLCB0b3VjaFN0YXJ0SGFuZGxlcik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluaXRpYWxpc2UgdGhlIHN3aXBlXG5cdFx0XHRpbml0KDEwMCwgNDApO1xuXHRcdH07XG5cdH07XG5cblx0Ly8gIENyZWF0ZSBhIGpRdWVyeSBwbHVnaW5cblx0JC5mbi5LT3NsaWRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsZW4gPSB0aGlzLmxlbmd0aDtcblxuXHRcdC8vICBFbmFibGUgbXVsdGlwbGUtc2xpZGVyIHN1cHBvcnRcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHQvLyAgQ2FjaGUgYSBjb3B5IG9mICQodGhpcyksIHNvIGl0XG5cdFx0XHR2YXIgbWUgICAgICAgPSAkKHRoaXMpLFxuXHRcdFx0XHRrZXkgICAgICA9ICdLT3NsaWRlcicgKyAobGVuID4gMSA/ICctJyArICsraW5kZXggOiAnJyksXG5cdFx0XHRcdG9wdGlvbnMgID0gbWUuZGF0YSgna29zbGlkZXInKSxcblx0XHRcdFx0aW5zdGFuY2UgPSAobmV3IEtPc2xpZGVyKS5pbml0KG1lLCBvcHRpb25zKVxuXHRcdFx0O1xuXG5cdFx0XHQvLyAgSW52b2tlIGFuIEtPc2xpZGVyIGluc3RhbmNlXG5cdFx0XHRtZS5kYXRhKGtleSwgaW5zdGFuY2UpLmRhdGEoJ2tleScsIGtleSk7XG5cdFx0fSk7XG5cdH07XG5cblx0JCgnW2RhdGEta29zbGlkZXJdJykuS09zbGlkZXIoKTtcblxuXHRLT3NsaWRlci52ZXJzaW9uID0gXCIwLjUuMFwiO1xufSkoalF1ZXJ5LCBmYWxzZSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=