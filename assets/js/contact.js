(() => {
  const decode = values =>
    values.map(n => String.fromCharCode(n)).join('');

  // Obfuscated in source to avoid trivial email/phone regex harvesting.
  const email = decode([
    97, 114, 108, 101, 46, 114, 46, 108, 111, 109, 109, 101, 108,
    64, 103, 109, 97, 105, 108, 46, 99, 111, 109
  ]);

  const phone = decode([
    43, 49, 56, 49, 50, 51, 54, 57, 49, 49, 53, 51
  ]);

  const contact = {
    email: {
      href: `mailto:${email}`,
      text: email
    },

    phone: {
      href: `tel:${phone}`,
      text: '+1 812 369 1153'
    },

    website: {
      href: 'https://arlelommel.github.io/',
      text: 'arlelommel.github.io'
    },

    linkedin: {
      href: 'https://www.linkedin.com/in/arlelommel/',
      text: 'linkedin.com/in/arlelommel'
    }
  };

  function createLink(item) {
    const link = document.createElement('a');

    link.href = item.href;
    link.textContent = item.text;

    return link;
  }

  function populateContactFields() {
    document.querySelectorAll('[data-contact]').forEach(element => {
      const type = element.dataset.contact;
      const item = contact[type];

      if (!item) {
        console.warn(`Unknown contact type: ${type}`);
        return;
      }

      element.replaceChildren(createLink(item));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateContactFields);
  } else {
    populateContactFields();
  }
})();