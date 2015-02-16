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
