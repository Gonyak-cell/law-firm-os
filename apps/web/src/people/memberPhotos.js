import choWooSang from "../assets/members/cho-woo-sang.png";
import kimYangTae from "../assets/members/kim-yang-tae.png";
import limYoungHoon from "../assets/members/lim-young-hoon.png";
import parkByeongJun from "../assets/members/park-byeong-jun.png";
import seoJiWon from "../assets/members/seo-ji-won.png";

export const MEMBER_PHOTOS = {
  조우상: choWooSang,
  김양태: kimYangTae,
  임영훈: limYoungHoon,
  박병준: parkByeongJun,
  서지원: seoJiWon
};

export function memberPhotoFor(name) {
  return MEMBER_PHOTOS[name];
}
