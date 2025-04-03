function wol()
{
    let oHandler = new PageRequestHandler();
    let cSection = oHandler.findSection();
    let cPath = generateUrlPath(cSection);
    let oDisplay = document.getElementById("contentDisplay");
    if (oDisplay)
        oHandler.display = oDisplay;

    let oNav = document.getElementById("mainNavList");
    if (oNav)
    {
        let aExpandElems = oNav.querySelectorAll("[aria-expanded]");
        if (aExpandElems && aExpandElems.length)
            oHandler.roots = aExpandElems;

        oHandler.getPath(cPath);
        oHandler.nav = oNav;
        let oElem = oNav.querySelector("[href='#" + cSection + "']");
        if (!oElem)
            oElem = [oNav.firstElementChild];

        oHandler.updateActive(oElem);

        //on page load, make sure the current selected node's parents are expanded
        let oParent = oElem.parentElement;
        while(oParent)
        {
            if (oParent.className == "collapse")
                oParent.previousElementSibling.setAttribute("aria-expanded", true);

            oParent = oParent.parentElement;
        }

        window.addEventListener("hashchange", async (evt) =>
        {
            cSection = oHandler.findSection();
            cPath = generateUrlPath(cSection);
            await oHandler.getPath(cPath);
            oElem = oNav.querySelector("[href='#" + cSection + "']");
            oHandler.updateActive(oElem);
        });
    }

    let oNavBarToggler = document.getElementById("navbar-toggler");
    if (oNavBarToggler)
    {
        oNavBarToggler.addEventListener("click", (oEvt) =>
        {
            let bOpen = oNavBarToggler.getAttribute("aria-expanded") == "false";
            oNavBarToggler.setAttribute("aria-expanded", bOpen);
            oNavBarToggler.parentElement.setAttribute("aria-expanded-container", bOpen);
        });
    }
}

function PageRequestHandler()
{
    let _this = this;
    let m_oDisplay = null;
    let m_oNav = null;

    let m_oObservedElems = new Map();
    let m_oObserver = new ResizeObserver(entries =>
    {
        entries.forEach(entry =>
        {
            if (entry.target != document.body)
                _updateAncestors(entry.target);
        });
    });

    let m_oCurrent;

    function init()
    {
        m_oObserver.observe(document.body);
    }

    this.getPath = async function (cPath)
    {
        let cHTML = await fetchContent(cPath);
        if (m_oDisplay)
            m_oDisplay.innerHTML = cHTML;
    };

    this.updateActive = function (oElem)
    {
        if (oElem)
        {
            //we have to check if we are a nested node, and if we are make sure our parents are active
            //we need to check if the current "top most node" contains the element(s) clicked on

            //the "active" page (aka, last selected item) needs an "aria-current='page'"

            if (m_oCurrent)
            {
                m_oCurrent.removeAttribute("aria-current");
                m_oCurrent.removeAttribute("data-active");
            }

            m_oCurrent = oElem;
            m_oCurrent.setAttribute("aria-current", "page");
            m_oCurrent.setAttribute("data-active", 1);

            m_oObservedElems.forEach((oData, oElem) =>
            {
                //the list element (parent) will contain everything
                if (oElem.parentNode.contains(m_oCurrent))
                    oElem.setAttribute("data-active", 1);
                else
                    oElem.removeAttribute("data-active");
            });
        }
    };

    this.findSection = function ()
    {
        // Get the current URL
        const cCurrentUrl = window.location.href;
        // Find the position of the "#" symbol
        const iHashIndex = cCurrentUrl.indexOf('#');

        let cSection = "overview";
        if (iHashIndex > -1)
        {
            // Extract the part after the "#"
            cSection = cCurrentUrl.substring(iHashIndex + 1);
        }

        return cSection;
    };

    function _handleRootClick(evt)
    {
        if (evt)
        {
            let oTarget = evt.target;
            let bExpanded = oTarget.getAttribute("aria-expanded") == "false";
            _calculateAnimateRoot(m_oObservedElems.get(oTarget).Expander, bExpanded)
            oTarget.setAttribute("aria-expanded", bExpanded);
            evt.preventDefault();
            evt.stopPropagation();
            return false;
        }
    }

    function _calculateAnimateRoot(oExpander, bExpanded)
    {
        const iHeight = oExpander.scrollHeight;
        oExpander.style.height = bExpanded ? 0 : `${iHeight}px`;

        requestAnimationFrame(() =>
        {
            oExpander.style.height = bExpanded ? `${iHeight}px` : 0;
        })



        oExpander.addEventListener("transitionend", function handleTransiitonEnd(evt)
        {
            oExpander.style.height = "";
            oExpander.removeEventListener("transitionend", handleTransiitonEnd);
        })
    }

    function _updateAncestors(oElem)
    {
        const aAncestors = m_oObservedElems.get(oElem).Ancestors;
        aAncestors.forEach(oParent =>
        {
            if (oElem.getAttribute('aria-expanded') == "false" && oElem.style.height == "")
                return;

            oParent.style.height = 'auto'; // Temporarily set to auto to get the full height
            const iHeight = oParent.scrollHeight; // Measure the height
            oParent.style.height = '0'; // Reset to 0 to prepare for transition
            requestAnimationFrame(() =>
            {
                oParent.style.height = `${iHeight}px`; // Apply the measured height
            });
        });
    }

    function _getAncestors(oElem)
    {
        let aAncestors = [];
        let oParent = oElem.parentElement.closest('.collapse');
        while (oParent)
        {
            aAncestors.push(oParent);
            oParent = oParent.parentElement.closest('.collapse');
        }
        return aAncestors;
    }

    Object.defineProperty(this, "display", {
        get: () => m_oDisplay,
        set: (oHTMLObj) =>
        {
            m_oDisplay = oHTMLObj;
        }
    });

    Object.defineProperty(this, "nav", {
        get: () => m_oNav,
        set: (oHTMLObj) =>
        {
            m_oNav = oHTMLObj;
        }
    });

    Object.defineProperty(this, "roots", {
        set: (aElems) =>
        {
            let oRoot;
            for (let iLup = 0; iLup < aElems.length; iLup++)
            {
                oRoot = aElems[iLup];
                if (oRoot)
                {
                    const oResizer = oRoot.nextElementSibling;
                    if (oResizer)
                    {
                        oRoot.addEventListener("click", _handleRootClick);
                        m_oObservedElems.set(oRoot, { Ancestors: _getAncestors(oResizer), Animating: false, Expander: oResizer });
                        m_oObserver.observe(oRoot);
                    }
                }
            }
        }

    });

    init();
}

function generateUrlPath(cSection)
{
    // Construct the new URL
    let cPath = window.location.pathname;
    if (cPath.indexOf("/") == -1)
        cPath += "/";
    const newUrl = `${window.location.protocol}//${window.location.host}${cPath}Sections/${cSection}.html`;
    return newUrl;
}


async function fetchContent(cURL)
{
    try
    {
        const oResponse = await fetch(cURL);
        if (!oResponse.ok)
        {
            throw new Error('Page not found');
        }
        const text = await oResponse.text();
        return text;
    } catch (error)
    {
        return 'Page not found';
    }
}