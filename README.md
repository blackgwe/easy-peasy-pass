# Password Generator

Many Internet services are based on password authentication. Currently available password managers do not meet my security requirements. This software is **ABSOLUTELY NOT**  designed to manage highly sensitive passwords for financial services, health services etc, but it is supposed to implement elementary security properties better than other password managers.

## Related Work

* https://masterpassx.org/
* https://www.security-insider.de/password-manager-nein-danke-a-689795/

## Approach

Password generation is based on a website URL/domain, a secure master password hash and some other parameters such as lengths/variations of characters stored in publicly available templates. The generated password and its hash are never stored and never sent over the network (only the master password hash and related templates are stored).

The classic model for information security defines three objectives of security: **maintaining confidentiality, integrity, and availability**. We describe suitable measures to maintain these security properties and how we implemented them.

****

***Confidentiality*** refers to protecting sensitive data from being accessed by unauthorized parties. Implemented *Measures*:

* Never send a password or it’s hash over the network
* Simplicity / Transparency of the well documented source code → easy to prove
* Reproducible correctness of the secure password hash algorithm (cli → generate the argon2 / bcrypt of testKey, generate it with another program and compare the results)
* Don’t use the clipboard / don’t send any data over network
* Generate password and set it to the password field only for authorized users (master password).
  Example: 
  (1) password field with master password → generate secure `master–password–hash` (see [argon2-online](https://antelle.net/argon2-browser))
  (2) get template for password generation by this `master–password–hash` (public available with attributes lengths / version / variations of characters)

---

***Integrity*** refers to ensuring the authenticity/genuine of the program, i.e. the source code is not modified and can be proven by an ordinary software developer. Implemented *Measures*:

* Follow the open source principles, e.g. well documented, easily readable  source code that an ordinary software developer can understand and prove.
* Hash the source code and publish the hash
* Use secure password hash algorithm (correctness can be checked easily: cli → generate the argon2 / bcrypt of testKey, generate it with another program and compare the results)

*known Problems*: Keylogger; Javascript / Browser vulnerability

------

***Availability*** means that information is accessible by authorized users. Implemented *Measures*:

* SPOF
  * No dependency on an external service provider (cloud service etc)
  * Internet connection not required to generate a password
* Revoking passwords separately 
  → Versioned password generation templates

## Conclusions

tbd

## Acknowledgements

Tbd

## License

Aurelia is MIT licensed. You can find out more and read the license document [here](https://github.com/aurelia/aurelia/blob/master/LICENSE).