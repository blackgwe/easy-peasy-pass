# Password Generator

# Abstract

Many Internet services are based on password authentication. Currently available password managers do not meet my security requirements. This software is **ABSOLUTELY NOT**  designed to manage highly sensitive passwords for financial services, health services etc, but it is supposed to implement elementary security properties better than other password managers.

# Related Work

* https://masterpassx.org/

# Approach

Generate a password based on a site URL/domain or its name. Generated password and its hash are **never stored and never sent over the network** (only the master password hash is stored). Password generation relies on different templates (lengths/variations of characters).

The classic model for information security defines three objectives of security: maintaining confidentiality, integrity, and availability. We describe suitable measures to maintain these security properties and how we implemented them.

## Confidentiality

*Confidentiality* refers to protecting sensitive data from being accessed by unauthorized parties. 

### measures

* Never send a password or it’s hash over the network

* Simplicity / Transparency of the source code —> easy to prove

* reproducible correctness of the secure password hash algorithm (cli => generate the argon2 / bcrypt of testKey, generate it with another program and compare the results)

* Don’t use the clipboard

* Generate password and set it to the password field only for authorized users (master password).
  Example: 
  (1) value of the password field (master password) = “~zZ-G12#” 
  (2) generate secure user hash with salt and “large memory usage” (see https://antelle.net/argon2-browser/ *pass=~zZ-G12#, salt=a20bf19Z, time=1, mem=128000, hashLen=32, parallelism=1, type=0*)

  (3) get `password generation template` by this `user hash`
  (4) generate the password with this template (template attributes lengths/variations of characters/version)

## Integrity

*Integrity* refers to ensuring the authenticity of the program (source code) —that the program is not altered (the source of the code is genuine)

### Measures

* Use secure password hash algorithm (correctness can be checked easily: cli → generate the argon2 / bcrypt of testKey, generate it with another program and compare the results)
* Open source code that an ordinary programmer can understand.
* Hash the source code and publish the hash
* Problem: Keylogger
* Problem: Javascript / Browser vulnerability

## Availability

*Availability* means that information is accessible by authorized users (no denial of service).

### Measures

* SPOF
  * No dependency on an external service provider (cloud service etc)
  * Internet connection not required to generate a password
* Revoking passwords separately 
  → Every user / domain has its own generated password in different versions

# Conclusions

tbd

# Acknowledgements

tbd