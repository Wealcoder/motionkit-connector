=== MotionKit With Gsap ===
Contributors: wealcoder
Requires at least: 6.7
Tested up to: 7.1
Requires PHP: 7.4
License: Proprietary

Plays the animations you build in the MotionKit editor on your WordPress site.

== Description ==

MotionKit With Gsap plays the animations you build in the MotionKit editor on your WordPress site.

* Animation Engine - runs your scroll, page-load, click and hover animations.
* GSAP - loads GSAP and only the GSAP plugins you switch on.
* ScrollSmoother - smooth scrolling for the whole site or a single page.
* Page Transition - animated transitions between pages.
* Preloader - a loading screen that covers the page until it is ready.

Works together with the free MotionKit plugin from WordPress.org, which connects your site to the editor. Requires WordPress 6.7 or later and PHP 7.4 or later.

== Changelog ==

= 1.7.1 =
* Update: The animation engine is rebuilt from the latest MotionKit editor.

= 1.3.1 =
* Security: Hardened the REST endpoints, the session check and the signing secret.
* Security: The core MotionKit plugin is installed from WordPress.org only when you ask for it.
* Fix: The core plugin stays connected when this plugin is uninstalled.
* Fix: JavaScript optimizers and Rocket Loader no longer break the editor preview.
* Fix: The editor preview keeps working on sites that restrict the REST API.
* Fix: Backslashes in saved animation settings are kept.
* Fix: Removing the old MotionKit Connector never touches this plugin's own folder.
* Tweak: Renamed from MotionKit Connector to MotionKit With Gsap.

= 1.1.0 =
* New: A license key field in the plugin row, shown when your MotionKit account gives no key.
* Fix: The license key is kept when the server sends none.
* Fix: GSAP plugins you switch off are no longer loaded for visitors.

= 1.0.1 =
* New: Updates from MotionKit, with a Check for updates link in the plugin row.
* New: The editor knows which MotionKit plugins the site has.
* Fix: Switching off a GSAP plugin respects the global settings.
