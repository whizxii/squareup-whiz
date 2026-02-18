import avatarImg from "@/assets/avatar-npd-manager.png";

const AvatarNPDManager = ({ size = 220 }: { size?: number }) => (
  <img
    src={avatarImg}
    alt="NPD & Product Manager"
    width={size}
    height={size}
    style={{ width: size, height: size, objectFit: "contain", display: "block" }}
  />
);

export default AvatarNPDManager;
