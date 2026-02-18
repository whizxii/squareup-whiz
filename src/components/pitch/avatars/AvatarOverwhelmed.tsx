import avatarImg from "@/assets/avatar-overwhelmed.png";

const AvatarOverwhelmed = ({ size = 240 }: { size?: number }) => (
  <img
    src={avatarImg}
    alt="Overwhelmed team member"
    width={size}
    height={size}
    style={{ width: size, height: size, objectFit: "contain", display: "block" }}
  />
);

export default AvatarOverwhelmed;
