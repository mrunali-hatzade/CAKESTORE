
import org.yaml.snakeyaml.Yaml;
import java.io.FileInputStream;
import java.util.Map;

public class PropCheck {
    public static void main(String[] args) throws Exception {
        Yaml yaml = new Yaml();
        try {
            Map<String, Object> map = yaml.load(new FileInputStream("src/main/resources/application-prod.yml"));
            System.out.println("Parsed successfully");
        } catch (Exception e) {
            System.out.println("Exception: " + e.getMessage());
        }
    }
}
