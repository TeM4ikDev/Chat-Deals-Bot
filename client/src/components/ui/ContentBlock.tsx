import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";

interface Props {
  children?: React.ReactNode;
}

export default function ContentBlock({ children }: Props) {
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.4,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.1, scale: 1, y: 15 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      // className="w-full p-4 rounded-lg bg-white shadow-lg dark:bg-gray-800"
    >
      {children}
    </motion.div>
  );
}
