# Easy-Peasy Password Security Enhancer (e@syPe@syP@ss)

Many Internet services are still based on password authentication – unfortunately. Currently available password managers do not meet my security requirements. This software is **ABSOLUTELY NOT**  designed to manage highly sensitive passwords for financial services, health services etc, but it is supposed to implement elementary security properties better than other password managers.

In order to meet the common requirements for passwords  (upper and lower case letters, special characters) on the one hand, and the limited "retrievability of memorized passwords" of forgetful people on the other hand, a complex password is "reused" for different services directly or as a master password for a password safe (sometimes secured by 2FA additionally). The reduction to one secret (master password) to meet the requirements of simplicity and user-friendliness carries many risks. 
If this master password is compromised, access to all services/domains at once is possible. This vulnerability is real, most password managers keep the master password unencrypted in the main memory, which can be read easily (see c't 15/2020, p. 28). Key loggers are another way to easily get the master password.

The wish for simplicity stands in stark contradiction to a password security that is also desired. 

## Approach

A suitable approach to solve this discrepancy is a password generator, which complicate simple passwords using dynamic parameters. The parameters for such a complication function could be the url/domain of the website, a secure master password hash, an additional secret for the service/domain and some other parameters such as lengths or variations of characters stored in publicly available templates. 

**Preprocessing**: Calculate a cryptographic hash value using

* **Master-Password** (saved in device memory/storage for 14 days)
* **Salt** (random bytes, created once; hold in device storage)
* Essential parts of the **URL/Domain** (e.g. google.com)
* **Secret** (e.g. `email:mμSecretMailP@ssw0rd`)

**Optional additional XOR function (intermediate processing)** 

* Takes the cryptographic hash and maps it to another hash value (the XOR function on the cryptographic hash and a static correction value of the same magnitude results in equally distributed values and therefore does not reduce security)
* The purpose of this additional intermediate step is to map the hash value to any given byte sequence and therefore to any given password.

**Final processing**: Map the hash value (byte array) to an array of characters that form the generated password.

The classic model for information security defines three objectives of security: **confidentiality, integrity, and availability**. We describe suitable measures to maintain these security properties and how we implemented them in the section [Thoughts on Security](#thoughts-on-security).

## Implementation details & features

***Dead simple***. No software dependency, no dependency on external service — no network transport, no storage (only for optional settings not for password) — no password backup (except a handwritten note with the master password in the bank safe), proven security password hash algorithms.

***Meet password requirements***. The generation of the passwords relies on attributes like password length or special characters hold in generation templates (settings). There has to be a standard template which covers 99% of the desired application spectrum so that the software application can run without further settings if preferred.

***Follow the principle of data minimization.*** To ensure a high level of protection of the derived password, data storage is avoided as far as possible. The principle of data minimization means that the application should be functional even without storing any data, it should provide a higher degree of password protection by an additional master hash and an additional salt (random data, stored in a sandbox storage). It should offer outstanding usability if we store additional information to derive a user name or other login data.

***Up to date.*** Attacks on the derivation of secure password data should be easily prevented by the exchange of cryptographic algorithms. All additional login data (user name, metadata for deriving the secure password, such as password length) should be easily portable.

*******Password versioning*** [optional]. If it is necessary to change a compromised password, simply increment the version of the password generation template.

***Password sharing*** [optional]. If a password is used by a group of people, the secure password hash has to be derived from the secret hashes of the users (intermediate layer)

***Avoiding Pitfalls – Brute Force Attack.*** Various vulnerabilities could significantly increase the probability of a password being discovered by a brute force attack. For example mapping bytes to password characters could have a negative impact on the frequency distribution of the characters used in the password: If using the simple function `hash_byte modulo 127` to obtain the character index of an alphabet of 127 symbols the characters with indexes zero and one of alphabet are used 50% more often than the remaining 125. 

***Avoiding Pitfalls – Hash collisions.*** To prevent passwords from being accidentally discovered (e.g., if different users choose the same master password), each e@syPe@syP@ass installation requires a salt of random bytes. This salt also provides protection against brute force or dictionary attacks.

## Related Work

* [https://masterpassx.org/](https://masterpassx.org)
* [https://www.security-insider.de/password-manager-nein-danke-a-689795/](https://www.security-insider.de/password-manager-nein-danke-a-689795)

## Thoughts on Security

***Confidentiality*** refers to protecting sensitive data from being accessed by unauthorized parties. Implemented *Measures*:

* Never send a password or it’s hash over the network
* Simplicity / Transparency of the well documented source code → easy to prove
* Reproducible correctness of the secure password hash algorithm (cli → generate the hash of testKey, generate it with another program and compare the results) **TODO** NodeJS cli
* Don’t use the clipboard / don’t send any data over network
* Display only *strong* cryptographic hashed data
* Generate password and set it to the password field only for authorized users (master password / salt).
  Example: 
  (1) password field with master password → generate secure `master–password–hash
  (2) get template for password generation by this `master–password–hash` (public available with attributes lengths / version / variations of characters)

*Known problems*: Keylogger (Countermeasure: readonly salt); Javascript / Browser vulnerability (we have already accepted the consequences and do not use e@syPe@syP@ss for sensitive passwords in financial/health services etc.)

***Integrity*** refers to traceability of data changes and ensuring the authenticity/genuine of the program, i.e. the source code is not modified and its correctness and authenticity can be proven by an ordinary software developer. Implemented *Measures*:

* Follow the open source principles, e.g. well documented, easily readable  source code that an ordinary software developer can understand and prove.
* Hash the source code and publish the hash
* Use secure cryptographic hash function (correctness can be checked easily: cli → generate the testKey, generate it with another program and compare the results)

***Availability*** means that information is accessible by authorized users. Implemented *Measures*:

* SPOF
  * No dependency on an external service provider (cloud service etc)
  * Internet connection not required to generate a password
* Revoking passwords separately 
  → Versioned password generation templates

*Known problems*: Forgetting the master password (should not happen because it is always used), accidentally deleting the salt (Countermeasure e.g. a handwritten note of the base64-coded salt value deposited in a bank safe)

## Optional Features

**Synchronisation.** Since passwords and their hashes are not stored, there is no need to keep the data as secret as in other password stores. Nevertheless, metadata are sensitive as well, as information could potentially be derived that was not intended for the public. 

***Sharing.*** One of the most wanted features are shared passwords. Asymmetric cryptography is an unreasonable effort for e@syPe@syP@ass, main problem is then secrecy of the private key. Therefore, the password is symmetrically encrypted with a derived key based on a one-time password agreed upon by all involved parties (one sender, at least one recipient).  We propose a protocol and an open API for it and publish a reference implementation for a centralized service as open source, which can be deployed e.g. to [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/) or [Heroku](https://www.heroku.com/).

Each party (one sender, at least one recipient) generates a secret $$shared_i$$ of 4, 6 or 8 random characters or numbers and shares this secret with all parties over a secure channel. The concatenation of key parts $$shared_i$$ forms a one-time password. For sharing a password between two parties, a magnitude of $$10^{12}$$, $$10^{18}$$ or $$10^{24}$$ combinations is reached. This one-time password is used to derive a shared key for symmetrical encryption of password data with `pbkdf2`. To prevent rainbow table attacks a timestamp based $$salt_t$$ is additionally used.
$$
key_{secret} = pbkdf2(shared_1 + shared_2 + ... + shared_n, salt_t)
$$

$$
data_{encrypted} = encrypt(password, key_{secret})\\
password = decrypt(data_{encrypted}, key_{secret})
$$



## Conclusions

tbd

## Acknowledgements

Tbd

## License

Simple Password Generator is MIT licensed. You can find out more and read the license document [here](https://github.com/aurelia/aurelia/blob/master/LICENSE).
