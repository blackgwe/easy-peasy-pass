# Easy-Peasy Password (E@syPe@syP@ss)
**Dead simple tool for deriving complex credentials using PBKDF2**

Passwords are broken - to be more precise: they are currently not really suitable for determining who is sitting at the other end of a connection. Nevertheless, they are still the most important authentication method - multi-factor authentication and FIDO2 has been dragging on for years.

The reason: passwords are stolen, misused and resold in many different ways and – **most importantly** – passwords are often used multiple times and are also easy to crack.

E@syPe@syP@ss is an attempt, or more precisely an experiment, to develop a user-friendly alternative for a password store of "areas to be protected normally" using the simplest possible means.  It attempts to eliminate inherent weaknesses of other approaches, such as password managers, by using password hashes as the underlying mechanism.

## Features
**that are unique to password managers**

* storage of `site password` hash / `master password` hash only optional and not required
* no access to all passwords, even if the `master password` and all stored data is known
* multiple `master passwords` support different levels of protection
  * For very insensitive web sites one `master password` hash can be persisted in the extension's local storage and for services that require a higher protection another one that is not persisted can be used.
  * This can be used as a simple password share between closely linked users. 
* It is the user's responsibility to identify the threats and to take countermeasures – there is the freedom to do so.
  * If there is a high risk that a key-logger will be used, an additional parameter for deriving the password, such as the user name, can be used. 
  * If there is a high risk that the persistent data such as the `master password` hash will be stolen, the user can choose not to store it.
* Easy to understand, easy to prove
  * The source code of the extension and a demo page is available.
  * The demo page contains less than 100 lines html (including css) + less than 200 lines of Javascript code. There is no dependency on other projects/ vendors.
  * Password derivation is implemented with the native browser function `window.crypto.subtle::deriveKey()` using the well-known [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) / [AES-256-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode) methods at 100,000 iterations.

## Disclaimer

This software is **ABSOLUTELY NOT**  designed to manage highly sensitive passwords for financial services, 
health services etc, but it is supposed to implement elementary security properties better than current 
password managers.

## Project status
This project is currently still in pre-alpha-stage. Please use with care.

## Install
Tbd


## Acknowledgements

Tbd

## License

E@syPe@syP@ss is MIT licensed. You can find out more and read the license document [here](https://github.com/aurelia/aurelia/blob/master/LICENSE).
