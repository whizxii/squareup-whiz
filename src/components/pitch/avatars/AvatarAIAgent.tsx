import avatarImg from "@/assets/avatar-ai-agent.png";

const AvatarAIAgent = ({ size = 200 }: { size?: number }) => (
  <img
    src={avatarImg}
    alt="SquareUp AI Agent"
    width={size}
    height={size}
    style={{ width: size, height: size, objectFit: "contain", display: "block" }}
  />
);

export default AvatarAIAgent;
