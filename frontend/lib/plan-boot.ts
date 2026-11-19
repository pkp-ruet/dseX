/**
 * Runs in `<head>` before the first paint (beside the language and theme
 * scripts). The server never knows who is reading, so every page is sent in
 * its signed-out, locked form; React swaps it once sign-in loads, which on a
 * budget phone took seconds (design review 2026-11-19: paying members saw the
 * gold "Get Premium" card first, signed-in readers saw the sign-up landing).
 *
 * From the saved sign-in it sets, on `<html>`:
 *  - `data-signed-in="1"` while the saved token hasn't expired;
 *  - `data-plan="premium"` when the saved account is Premium (or admin) and
 *    its Premium hasn't ended.
 * CSS then shows locked parts and hides free-only parts (`.pl-free`) and the
 * signed-out landing (`.home-landing`) until React takes over. Crawlers carry
 * no token, so the indexed HTML is unchanged. Keys mirror `lib/auth.ts`.
 */
export const PLAN_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("dsex.auth.token");if(!t)return;var s=t.split(".")[1];if(!s)return;var p=JSON.parse(atob(s.replace(/-/g,"+").replace(/_/g,"/")));var now=Date.now();if(p.exp&&p.exp*1000<now)return;d.setAttribute("data-signed-in","1");var u=JSON.parse(localStorage.getItem("dsex.auth.user")||"null");if(u&&(u.is_admin||(u.is_premium&&(!u.premium_until||Date.parse(u.premium_until)>now))))d.setAttribute("data-plan","premium");}catch(e){}})();`;
