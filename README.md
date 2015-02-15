# KOslider
**KOslider** is a jQuery slider/carousel plugin that uses CSS3 transitions for its animation.

## Usage
Include **trak.js** in your JavaScript bundle or add it to your HTML page like this:

```html
<script type='application/javascript' src='/path/to/trak.js'></script>
```

There are two ways to use **KOslider**: the `data-koslider` attribute or with the traditional jQuery plugin call `$('.element').KOslider()`.

#### Example usage on an HTML element:
```html
<div data-koslider='{"dots":"true","arrows":"true","keys":"true","uiPosition":"above","debug":"true"}'>
```

All options are defined using JSON. Please note that the initial opening quote on the `data-koslider` attr has a single quote. This means we can use double quotes within the options object.

#### KOslider can also be called using standard jQuery syntax:
```js
// Doc ready
$(function(){

	$('.slider').KOslider({
		keys : true,
		uiPosition : "below",
		customPrevClass : "icon-arrow-previous",
		customNextClass : "icon-arrow-next",
		debug : true,
		itemWidth : "200px"
	});

});
```

#### Default options:
```
"keys"            : false,                 [boolean] keyboard shortcuts (boolean)
"dots"            : true,                  [boolean] display ••••o• pagination (boolean)
"dotsClick"       : false                  [boolean] enable clickable dots
"arrows"          : true,                  [boolean] display prev/next arrows (boolean)
"sliderEl"        : ".KOslider",           [string]  slides container selector
"slide"           : ".KOslider-slide",     [string]  slidable items selector
"uiPosition"      : "above",               [string]  Options: above or below
"customPrevClass" : "icon-arrow-previous", [string]  Classname for prev button icon
"customNextClass" : "icon-arrow-next"      [string]  Classname for next button icon
"debug"           : false                  [boolean] Show debug info
"setHeight"       : "auto"                 [string]  "auto" = Change height of slides according to content; "equal" = equalise height of all slides; "none" = don't adjust height at all
"debug"           : false                  [boolean] Show debug info
"autoplay"        : false                  [boolean] autoplay the slider
"autoplayInterval": 4000                   [integer] Change the autoplay speed
"swipe"           : false                  [boolean] enable swipe for touch
"itemWidth"       : undefined              [string]  define an element width instead of calculating it
"inactiveClass"   : "slider--inactive"     [string]
"activeClass"     : "slider--active"       [string]
"callbacks"       : undefined              [object]  Add custom callbacks
"equaliseEl"      : undefined              [string]  Selector used to calculate equalised heights
```

## Markup
Wrap your existing markup with the element that has  attr

```html
<div data-koslider='{"dots":"true","arrows":"true","keys":"true","uiPosition":"above","debug":"true"}'>
	<ul class="slider clearfix">
		<li class="slide"></li>
		<li class="slide"></li>
		<li class="slide"></li>
	</ul>
</div>

<!-- or -->

<div class="KOsliderContainer">
	<ul class="slider clearfix">
		<li class="slide"></li>
		<li class="slide"></li>
		<li class="slide"></li>
	</ul>
</div>
```

## Assumptions
This plugin assumes a few things so that it works properly:

1. That you use some js to modify classes on the `<html>` element to tell if js is available. It uses the Modernizr `.no-js` / `.js` example. This is done so that the slider can be styled well when js is unavailable. See our demo for an example of this without using Modernizr.
2. That you want resize events debounced. Included is a small script that allows resize events to be made more effecient.


